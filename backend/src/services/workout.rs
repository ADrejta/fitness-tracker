use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::{
    WorkoutExerciseResponse, WorkoutResponse, WorkoutSetResponse,
};
use crate::error::AppError;
use crate::models::RecordType;
use crate::repositories::{PersonalRecordRepository, TemplateRepository, WorkoutRepository};

pub struct WorkoutService;

/// Calculate estimated 1RM using the Brzycki formula
/// Formula: weight * (36 / (37 - reps))
/// Only valid for reps between 1-12
pub fn calculate_estimated_1rm(weight: f64, reps: i32) -> Option<f64> {
    if reps <= 0 || reps > 12 {
        return None;
    }
    Some(weight * (36.0 / (37.0 - reps as f64)))
}

#[cfg(test)]
/// Calculate total volume for a set (weight * reps)
pub fn calculate_set_volume(weight: Option<f64>, reps: Option<i32>) -> f64 {
    match (weight, reps) {
        (Some(w), Some(r)) if r > 0 => w * r as f64,
        _ => 0.0,
    }
}

impl WorkoutService {
    pub async fn get_workout_with_exercises(
        pool: &PgPool,
        workout_id: Uuid,
        user_id: Uuid,
    ) -> Result<WorkoutResponse, AppError> {
        let workout = WorkoutRepository::find_by_id(pool, workout_id, user_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Workout not found".to_string()))?;

        let exercises = WorkoutRepository::get_exercises(pool, workout_id).await?;

        let mut exercise_responses = Vec::new();
        for exercise in exercises {
            let sets = WorkoutRepository::get_sets(pool, exercise.id).await?;
            exercise_responses.push(WorkoutExerciseResponse {
                id: exercise.id,
                exercise_template_id: exercise.exercise_template_id,
                exercise_name: exercise.exercise_name,
                sets: sets
                    .into_iter()
                    .map(|s| WorkoutSetResponse {
                        id: s.id,
                        set_number: s.set_number,
                        target_reps: s.target_reps,
                        actual_reps: s.actual_reps,
                        target_weight: s.target_weight,
                        actual_weight: s.actual_weight,
                        is_warmup: s.is_warmup,
                        is_completed: s.is_completed,
                        completed_at: s.completed_at,
                    })
                    .collect(),
                notes: exercise.notes,
                superset_id: exercise.superset_id,
            });
        }

        Ok(WorkoutResponse {
            id: workout.id,
            name: workout.name,
            started_at: workout.started_at,
            completed_at: workout.completed_at,
            exercises: exercise_responses,
            total_volume: workout.total_volume,
            total_sets: workout.total_sets,
            total_reps: workout.total_reps,
            duration: workout.duration,
            status: workout.status,
            template_id: workout.template_id,
            notes: workout.notes,
        })
    }

    pub async fn start_from_template(
        pool: &PgPool,
        user_id: Uuid,
        template_id: Uuid,
    ) -> Result<WorkoutResponse, AppError> {
        let template = TemplateRepository::find_by_id(pool, template_id, user_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Template not found".to_string()))?;

        let template_exercises =
            TemplateRepository::get_exercises_with_sets(pool, template_id).await?;

        // Create workout
        let workout = WorkoutRepository::create(
            pool,
            user_id,
            &template.name,
            Some(template_id),
            None,
        )
        .await?;

        // Copy exercises and sets from template
        for template_exercise in template_exercises {
            let workout_exercise = WorkoutRepository::add_exercise(
                pool,
                workout.id,
                &template_exercise.exercise_template_id,
                &template_exercise.exercise_name,
                template_exercise.notes.as_deref(),
                template_exercise.superset_id,
            )
            .await?;

            for set in template_exercise.sets {
                WorkoutRepository::add_set(
                    pool,
                    workout_exercise.id,
                    Some(set.target_reps),
                    set.target_weight,
                    set.is_warmup,
                )
                .await?;
            }
        }

        // Increment template usage
        TemplateRepository::increment_usage(pool, template_id).await?;

        Self::get_workout_with_exercises(pool, workout.id, user_id).await
    }

    pub async fn start_empty(
        pool: &PgPool,
        user_id: Uuid,
        name: &str,
    ) -> Result<WorkoutResponse, AppError> {
        let workout = WorkoutRepository::create(pool, user_id, name, None, None).await?;
        Self::get_workout_with_exercises(pool, workout.id, user_id).await
    }

    pub async fn complete_workout(
        pool: &PgPool,
        workout_id: Uuid,
        user_id: Uuid,
    ) -> Result<WorkoutResponse, AppError> {
        // Complete the workout
        let workout = WorkoutRepository::complete(pool, workout_id, user_id).await?;

        // Check for personal records
        Self::detect_personal_records(pool, workout_id, user_id).await?;

        Self::get_workout_with_exercises(pool, workout.id, user_id).await
    }

    async fn detect_personal_records(
        pool: &PgPool,
        workout_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), AppError> {
        let exercises = WorkoutRepository::get_exercises(pool, workout_id).await?;

        for exercise in exercises {
            let sets = WorkoutRepository::get_sets(pool, exercise.id).await?;

            // Filter completed, non-warmup sets
            let working_sets: Vec<_> = sets
                .iter()
                .filter(|s| s.is_completed && !s.is_warmup)
                .collect();

            if working_sets.is_empty() {
                continue;
            }

            // Max weight PR
            if let Some(max_weight_set) = working_sets
                .iter()
                .filter_map(|s| s.actual_weight.map(|w| (w, s)))
                .max_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal))
            {
                let current_max = PersonalRecordRepository::get_current_record(
                    pool,
                    user_id,
                    &exercise.exercise_template_id,
                    &RecordType::MaxWeight,
                )
                .await?;

                if current_max.map_or(true, |r| max_weight_set.0 > r.value) {
                    PersonalRecordRepository::create(
                        pool,
                        user_id,
                        &exercise.exercise_template_id,
                        &exercise.exercise_name,
                        &RecordType::MaxWeight,
                        max_weight_set.0,
                        max_weight_set.1.actual_reps,
                        Utc::now(),
                        workout_id,
                    )
                    .await?;
                }
            }

            // Max reps PR (for bodyweight exercises or highest reps at any weight)
            if let Some(max_reps_set) = working_sets
                .iter()
                .filter_map(|s| s.actual_reps.map(|r| (r, s)))
                .max_by_key(|a| a.0)
            {
                let current_max = PersonalRecordRepository::get_current_record(
                    pool,
                    user_id,
                    &exercise.exercise_template_id,
                    &RecordType::MaxReps,
                )
                .await?;

                if current_max.map_or(true, |r| max_reps_set.0 as f64 > r.value) {
                    PersonalRecordRepository::create(
                        pool,
                        user_id,
                        &exercise.exercise_template_id,
                        &exercise.exercise_name,
                        &RecordType::MaxReps,
                        max_reps_set.0 as f64,
                        Some(max_reps_set.0),
                        Utc::now(),
                        workout_id,
                    )
                    .await?;
                }
            }

            // Estimated 1RM PR (Brzycki formula)
            if let Some(best_1rm) = working_sets
                .iter()
                .filter_map(|s| {
                    match (s.actual_weight, s.actual_reps) {
                        (Some(weight), Some(reps)) => {
                            calculate_estimated_1rm(weight, reps)
                                .map(|e1rm| (e1rm, weight, reps))
                        }
                        _ => None,
                    }
                })
                .max_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal))
            {
                let current_max = PersonalRecordRepository::get_current_record(
                    pool,
                    user_id,
                    &exercise.exercise_template_id,
                    &RecordType::Estimated1rm,
                )
                .await?;

                if current_max.map_or(true, |r| best_1rm.0 > r.value) {
                    PersonalRecordRepository::create(
                        pool,
                        user_id,
                        &exercise.exercise_template_id,
                        &exercise.exercise_name,
                        &RecordType::Estimated1rm,
                        best_1rm.0,
                        Some(best_1rm.2),
                        Utc::now(),
                        workout_id,
                    )
                    .await?;
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== Estimated 1RM Tests ====================

    #[test]
    fn test_calculate_estimated_1rm_single_rep() {
        // At 1 rep, e1RM should equal actual weight
        let weight = 100.0;
        let e1rm = calculate_estimated_1rm(weight, 1).unwrap();
        assert!((e1rm - 100.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_estimated_1rm_five_reps() {
        // 100kg x 5 reps = 100 * (36 / 32) = 112.5kg
        let weight = 100.0;
        let e1rm = calculate_estimated_1rm(weight, 5).unwrap();
        let expected = 100.0 * (36.0 / 32.0);
        assert!((e1rm - expected).abs() < 0.01);
    }

    #[test]
    fn test_calculate_estimated_1rm_ten_reps() {
        // 100kg x 10 reps = 100 * (36 / 27) ≈ 133.33kg
        let weight = 100.0;
        let e1rm = calculate_estimated_1rm(weight, 10).unwrap();
        let expected = 100.0 * (36.0 / 27.0);
        assert!((e1rm - expected).abs() < 0.01);
    }

    #[test]
    fn test_calculate_estimated_1rm_twelve_reps() {
        // Maximum valid reps
        let weight = 100.0;
        let e1rm = calculate_estimated_1rm(weight, 12).unwrap();
        let expected = 100.0 * (36.0 / 25.0);
        assert!((e1rm - expected).abs() < 0.01);
    }

    #[test]
    fn test_calculate_estimated_1rm_zero_reps_returns_none() {
        let result = calculate_estimated_1rm(100.0, 0);
        assert!(result.is_none());
    }

    #[test]
    fn test_calculate_estimated_1rm_negative_reps_returns_none() {
        let result = calculate_estimated_1rm(100.0, -5);
        assert!(result.is_none());
    }

    #[test]
    fn test_calculate_estimated_1rm_over_twelve_reps_returns_none() {
        let result = calculate_estimated_1rm(100.0, 13);
        assert!(result.is_none());
    }

    #[test]
    fn test_calculate_estimated_1rm_high_reps_returns_none() {
        let result = calculate_estimated_1rm(100.0, 20);
        assert!(result.is_none());
    }

    #[test]
    fn test_calculate_estimated_1rm_increasing_reps_increases_e1rm() {
        let weight = 100.0;

        let e1rm_3 = calculate_estimated_1rm(weight, 3).unwrap();
        let e1rm_5 = calculate_estimated_1rm(weight, 5).unwrap();
        let e1rm_8 = calculate_estimated_1rm(weight, 8).unwrap();

        // More reps at same weight = higher estimated 1RM
        assert!(e1rm_3 < e1rm_5);
        assert!(e1rm_5 < e1rm_8);
    }

    #[test]
    fn test_calculate_estimated_1rm_real_world_example() {
        // Real-world: 140kg x 3 reps
        // Expected e1RM ≈ 148.2kg
        let e1rm = calculate_estimated_1rm(140.0, 3).unwrap();
        let expected = 140.0 * (36.0 / 34.0);
        assert!((e1rm - expected).abs() < 0.01);
        assert!(e1rm > 140.0 && e1rm < 160.0);
    }

    // ==================== Set Volume Tests ====================

    #[test]
    fn test_calculate_set_volume_normal() {
        let volume = calculate_set_volume(Some(100.0), Some(10));
        assert!((volume - 1000.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_set_volume_heavy_single() {
        let volume = calculate_set_volume(Some(200.0), Some(1));
        assert!((volume - 200.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_set_volume_no_weight() {
        let volume = calculate_set_volume(None, Some(10));
        assert!((volume - 0.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_set_volume_no_reps() {
        let volume = calculate_set_volume(Some(100.0), None);
        assert!((volume - 0.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_set_volume_both_none() {
        let volume = calculate_set_volume(None, None);
        assert!((volume - 0.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_set_volume_zero_reps() {
        let volume = calculate_set_volume(Some(100.0), Some(0));
        assert!((volume - 0.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_set_volume_negative_reps() {
        let volume = calculate_set_volume(Some(100.0), Some(-5));
        assert!((volume - 0.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_set_volume_decimal_weight() {
        let volume = calculate_set_volume(Some(102.5), Some(8));
        assert!((volume - 820.0).abs() < 0.01);
    }

    // ==================== Workout Status Tests ====================

    #[test]
    fn test_workout_status_serialization() {
        use crate::models::WorkoutStatus;

        let in_progress = WorkoutStatus::InProgress;
        let completed = WorkoutStatus::Completed;
        let cancelled = WorkoutStatus::Cancelled;

        let json1 = serde_json::to_string(&in_progress).unwrap();
        let json2 = serde_json::to_string(&completed).unwrap();
        let json3 = serde_json::to_string(&cancelled).unwrap();

        assert_eq!(json1, "\"in-progress\"");
        assert_eq!(json2, "\"completed\"");
        assert_eq!(json3, "\"cancelled\"");
    }

    #[test]
    fn test_workout_status_deserialization() {
        use crate::models::WorkoutStatus;

        let in_progress: WorkoutStatus = serde_json::from_str("\"in-progress\"").unwrap();
        let completed: WorkoutStatus = serde_json::from_str("\"completed\"").unwrap();
        let cancelled: WorkoutStatus = serde_json::from_str("\"cancelled\"").unwrap();

        assert_eq!(in_progress, WorkoutStatus::InProgress);
        assert_eq!(completed, WorkoutStatus::Completed);
        assert_eq!(cancelled, WorkoutStatus::Cancelled);
    }

    // ==================== Record Type Tests ====================

    #[test]
    fn test_record_type_serialization() {
        let max_weight = RecordType::MaxWeight;
        let max_reps = RecordType::MaxReps;
        let max_volume = RecordType::MaxVolume;
        let estimated = RecordType::Estimated1rm;

        assert_eq!(serde_json::to_string(&max_weight).unwrap(), "\"max-weight\"");
        assert_eq!(serde_json::to_string(&max_reps).unwrap(), "\"max-reps\"");
        assert_eq!(serde_json::to_string(&max_volume).unwrap(), "\"max-volume\"");
        assert_eq!(serde_json::to_string(&estimated).unwrap(), "\"estimated-1rm\"");
    }

    #[test]
    fn test_record_type_deserialization() {
        let max_weight: RecordType = serde_json::from_str("\"max-weight\"").unwrap();
        let max_reps: RecordType = serde_json::from_str("\"max-reps\"").unwrap();
        let estimated: RecordType = serde_json::from_str("\"estimated-1rm\"").unwrap();

        assert_eq!(max_weight, RecordType::MaxWeight);
        assert_eq!(max_reps, RecordType::MaxReps);
        assert_eq!(estimated, RecordType::Estimated1rm);
    }
}
