use chrono::{Datelike, Duration, NaiveDate, Utc};
use sqlx::PgPool;
use tracing::{debug, error, info, instrument};
use uuid::Uuid;

#[cfg(test)]
/// Calculate current and longest streak from a list of workout dates.
/// Dates should be sorted in descending order (most recent first).
pub fn calculate_streaks_from_dates(workout_dates: &[NaiveDate], today: NaiveDate) -> (i32, i32) {
    if workout_dates.is_empty() {
        return (0, 0);
    }

    let mut current_streak = 0;
    let mut longest_streak = 0;
    let mut streak = 0;
    let mut last_date: Option<NaiveDate> = None;

    for date in workout_dates {
        if let Some(last) = last_date {
            let diff = (last - *date).num_days();
            if diff == 1 {
                streak += 1;
            } else {
                longest_streak = longest_streak.max(streak);
                streak = 1;
            }
        } else {
            // First date
            let diff = (today - *date).num_days();
            if diff <= 1 {
                streak = 1;
                current_streak = 1;
            } else {
                streak = 1;
            }
        }
        last_date = Some(*date);
    }

    longest_streak = longest_streak.max(streak);

    // Calculate current streak
    if !workout_dates.is_empty() {
        let mut streak_count = 0;
        let mut check_date = today;

        for date in workout_dates {
            if *date == check_date || *date == check_date - Duration::days(1) {
                streak_count += 1;
                check_date = *date - Duration::days(1);
            } else {
                break;
            }
        }
        current_streak = streak_count;
    }

    (current_streak, longest_streak)
}

#[cfg(test)]
/// Calculate percentage of a part to a total
pub fn calculate_percentage(part: i64, total: i64) -> f64 {
    if total > 0 {
        (part as f64 / total as f64) * 100.0
    } else {
        0.0
    }
}

#[cfg(test)]
/// Calculate estimated 1RM using Brzycki formula
/// Used in statistics for exercise progress charts
pub fn estimate_1rm(weight: f64, reps: i32) -> Option<f64> {
    if reps > 0 && reps <= 12 {
        Some(weight * (36.0 / (37.0 - reps as f64)))
    } else {
        None
    }
}

use crate::dto::{
    DashboardSummary, ExerciseHistoryEntry, ExerciseProgressResponse, MuscleGroupData,
    MuscleGroupDistribution, PersonalRecordResponse, SetHistoryEntry, StatisticsQuery, WeekVolume,
    WeeklyVolumeResponse,
};
use crate::error::AppError;
use crate::models::MuscleGroup;
use crate::repositories::PersonalRecordRepository;

pub struct StatisticsService;

impl StatisticsService {
    #[instrument(skip(pool), fields(user_id = %user_id))]
    pub async fn get_dashboard_summary(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<DashboardSummary, AppError> {
        info!("Starting dashboard summary calculation");

        let now = Utc::now();
        let week_start = now - Duration::days(now.weekday().num_days_from_monday() as i64);
        debug!("Week start calculated as: {}", week_start);

        // Total workouts
        debug!("Querying total workouts count");
        let total_workouts = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM workouts WHERE user_id = $1 AND status = 'completed'",
        )
        .bind(user_id)
        .fetch_one(pool)
        .await
        .map_err(|e| {
            error!("Failed to query total workouts: {:?}", e);
            e
        })?;
        debug!("Total workouts: {}", total_workouts);

        // Workouts this week
        debug!("Querying workouts this week");
        let workouts_this_week = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM workouts WHERE user_id = $1 AND status = 'completed' AND started_at >= $2",
        )
        .bind(user_id)
        .bind(week_start)
        .fetch_one(pool)
        .await
        .map_err(|e| {
            error!("Failed to query workouts this week: {:?}", e);
            e
        })?;
        debug!("Workouts this week: {}", workouts_this_week);

        // Total and weekly volume
        debug!("Querying volume data");
        let (total_volume, volume_this_week) = sqlx::query_as::<_, (f64, f64)>(
            r#"
            SELECT
                COALESCE(SUM(total_volume), 0),
                COALESCE(SUM(CASE WHEN started_at >= $2 THEN total_volume ELSE 0 END), 0)
            FROM workouts
            WHERE user_id = $1 AND status = 'completed'
            "#,
        )
        .bind(user_id)
        .bind(week_start)
        .fetch_one(pool)
        .await
        .map_err(|e| {
            error!("Failed to query volume data: {:?}", e);
            e
        })?;
        debug!("Total volume: {}, Volume this week: {}", total_volume, volume_this_week);

        // Total sets and reps
        debug!("Querying sets and reps");
        let (total_sets, total_reps) = sqlx::query_as::<_, (i64, i64)>(
            r#"
            SELECT
                COALESCE(SUM(total_sets), 0)::bigint,
                COALESCE(SUM(total_reps), 0)::bigint
            FROM workouts
            WHERE user_id = $1 AND status = 'completed'
            "#,
        )
        .bind(user_id)
        .fetch_one(pool)
        .await
        .map_err(|e| {
            error!("Failed to query sets and reps: {:?}", e);
            e
        })?;
        debug!("Total sets: {}, Total reps: {}", total_sets, total_reps);

        // Streaks
        debug!("Calculating streaks");
        let (current_streak, longest_streak) = Self::calculate_streaks(pool, user_id).await
            .map_err(|e| {
                error!("Failed to calculate streaks: {:?}", e);
                e
            })?;
        debug!("Current streak: {}, Longest streak: {}", current_streak, longest_streak);

        // Recent PRs
        debug!("Fetching recent PRs");
        let recent_prs = PersonalRecordRepository::find_recent(pool, user_id, 5).await
            .map_err(|e| {
                error!("Failed to fetch recent PRs: {:?}", e);
                e
            })?;
        debug!("Found {} recent PRs", recent_prs.len());
        let recent_prs = recent_prs
            .into_iter()
            .map(|pr| PersonalRecordResponse {
                id: pr.id,
                exercise_template_id: pr.exercise_template_id,
                exercise_name: pr.exercise_name,
                type_: pr.type_,
                value: pr.value,
                reps: pr.reps,
                achieved_at: pr.achieved_at,
                workout_id: pr.workout_id,
            })
            .collect();

        info!("Dashboard summary calculation completed successfully");
        Ok(DashboardSummary {
            total_workouts,
            workouts_this_week,
            total_volume,
            volume_this_week,
            total_sets,
            total_reps,
            current_streak,
            longest_streak,
            recent_prs,
        })
    }

    #[instrument(skip(pool), fields(user_id = %user_id))]
    async fn calculate_streaks(pool: &PgPool, user_id: Uuid) -> Result<(i32, i32), AppError> {
        debug!("Fetching workout dates for streak calculation");
        let workout_dates = sqlx::query_scalar::<_, NaiveDate>(
            r#"
            SELECT DISTINCT DATE(started_at) as workout_date
            FROM workouts
            WHERE user_id = $1 AND status = 'completed'
            ORDER BY workout_date DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            error!("Failed to fetch workout dates for streaks: {:?}", e);
            e
        })?;

        debug!("Found {} workout dates", workout_dates.len());

        if workout_dates.is_empty() {
            debug!("No workout dates found, returning zero streaks");
            return Ok((0, 0));
        }

        let today = Utc::now().date_naive();
        let mut current_streak = 0;
        let mut longest_streak = 0;
        let mut streak = 0;
        let mut last_date: Option<NaiveDate> = None;

        for date in &workout_dates {
            if let Some(last) = last_date {
                let diff = (last - *date).num_days();
                if diff == 1 {
                    streak += 1;
                } else {
                    longest_streak = longest_streak.max(streak);
                    streak = 1;
                }
            } else {
                // First date
                let diff = (today - *date).num_days();
                if diff <= 1 {
                    streak = 1;
                    current_streak = 1;
                } else {
                    streak = 1;
                }
            }
            last_date = Some(*date);
        }

        longest_streak = longest_streak.max(streak);

        // Calculate current streak
        if !workout_dates.is_empty() {
            let mut streak_count = 0;
            let mut check_date = today;

            for date in &workout_dates {
                if *date == check_date || *date == check_date - Duration::days(1) {
                    streak_count += 1;
                    check_date = *date - Duration::days(1);
                } else {
                    break;
                }
            }
            current_streak = streak_count;
        }

        Ok((current_streak, longest_streak))
    }

    pub async fn get_weekly_volume(
        pool: &PgPool,
        user_id: Uuid,
        query: &StatisticsQuery,
    ) -> Result<WeeklyVolumeResponse, AppError> {
        let weeks = query.weeks.unwrap_or(12);
        let end_date = query.end_date.unwrap_or_else(|| Utc::now().date_naive());
        let start_date = query
            .start_date
            .unwrap_or_else(|| end_date - Duration::weeks(weeks as i64));

        let rows = sqlx::query_as::<_, WeekVolumeRow>(
            r#"
            SELECT
                DATE_TRUNC('week', started_at)::date as week_start,
                COALESCE(SUM(total_volume), 0) as total_volume,
                COUNT(*)::int as workout_count
            FROM workouts
            WHERE user_id = $1
                AND status = 'completed'
                AND DATE(started_at) >= $2
                AND DATE(started_at) <= $3
            GROUP BY DATE_TRUNC('week', started_at)
            ORDER BY week_start
            "#,
        )
        .bind(user_id)
        .bind(start_date)
        .bind(end_date)
        .fetch_all(pool)
        .await?;

        Ok(WeeklyVolumeResponse {
            weeks: rows
                .into_iter()
                .map(|r| WeekVolume {
                    week_start: r.week_start,
                    total_volume: r.total_volume,
                    workout_count: r.workout_count,
                })
                .collect(),
        })
    }

    pub async fn get_muscle_group_distribution(
        pool: &PgPool,
        user_id: Uuid,
        query: &StatisticsQuery,
    ) -> Result<MuscleGroupDistribution, AppError> {
        let end_date = query.end_date.unwrap_or_else(|| Utc::now().date_naive());
        let start_date = query
            .start_date
            .unwrap_or_else(|| end_date - Duration::days(30));

        let rows = sqlx::query_as::<_, MuscleGroupRow>(
            r#"
            SELECT
                emg.muscle_group,
                COUNT(DISTINCT ws.id) as set_count,
                COALESCE(SUM(ws.actual_weight * ws.actual_reps), 0) as volume
            FROM workouts w
            JOIN workout_exercises we ON we.workout_id = w.id
            JOIN workout_sets ws ON ws.workout_exercise_id = we.id
            JOIN exercise_muscle_groups emg ON emg.exercise_id = we.exercise_template_id
            WHERE w.user_id = $1
                AND w.status = 'completed'
                AND ws.is_completed = true
                AND ws.is_warmup = false
                AND DATE(w.started_at) >= $2
                AND DATE(w.started_at) <= $3
            GROUP BY emg.muscle_group
            ORDER BY set_count DESC
            "#,
        )
        .bind(user_id)
        .bind(start_date)
        .bind(end_date)
        .fetch_all(pool)
        .await?;

        let total_sets: i64 = rows.iter().map(|r| r.set_count).sum();

        Ok(MuscleGroupDistribution {
            distributions: rows
                .into_iter()
                .map(|r| MuscleGroupData {
                    muscle_group: r.muscle_group,
                    set_count: r.set_count,
                    volume: r.volume,
                    percentage: if total_sets > 0 {
                        (r.set_count as f64 / total_sets as f64) * 100.0
                    } else {
                        0.0
                    },
                })
                .collect(),
        })
    }

    pub async fn get_exercise_progress(
        pool: &PgPool,
        user_id: Uuid,
        exercise_id: &str,
    ) -> Result<ExerciseProgressResponse, AppError> {
        // Get exercise name
        let exercise_name = sqlx::query_scalar::<_, String>(
            "SELECT name FROM exercise_templates WHERE id = $1",
        )
        .bind(exercise_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Exercise not found".to_string()))?;

        // Get workout history for this exercise (ordered oldest to newest for chart display)
        let history_rows = sqlx::query_as::<_, ExerciseHistoryRow>(
            r#"
            SELECT
                w.id as workout_id,
                w.started_at as date,
                we.id as workout_exercise_id
            FROM workouts w
            JOIN workout_exercises we ON we.workout_id = w.id
            WHERE w.user_id = $1
                AND w.status = 'completed'
                AND we.exercise_template_id = $2
            ORDER BY w.started_at ASC
            LIMIT 50
            "#,
        )
        .bind(user_id)
        .bind(exercise_id)
        .fetch_all(pool)
        .await?;

        let mut history = Vec::new();
        for row in history_rows {
            let sets = sqlx::query_as::<_, SetRow>(
                r#"
                SELECT set_number, actual_reps, actual_weight, is_warmup
                FROM workout_sets
                WHERE workout_exercise_id = $1 AND is_completed = true
                ORDER BY set_number
                "#,
            )
            .bind(row.workout_exercise_id)
            .fetch_all(pool)
            .await?;

            let working_sets: Vec<_> = sets.iter().filter(|s| !s.is_warmup).collect();

            let max_weight = working_sets
                .iter()
                .filter_map(|s| s.actual_weight)
                .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

            let total_volume: f64 = working_sets
                .iter()
                .filter_map(|s| match (s.actual_weight, s.actual_reps) {
                    (Some(w), Some(r)) => Some(w * r as f64),
                    _ => None,
                })
                .sum();

            // Estimated 1RM from best set
            let estimated_1rm = working_sets
                .iter()
                .filter_map(|s| match (s.actual_weight, s.actual_reps) {
                    (Some(w), Some(r)) if r > 0 && r <= 12 => {
                        Some(w * (36.0 / (37.0 - r as f64)))
                    }
                    _ => None,
                })
                .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

            history.push(ExerciseHistoryEntry {
                date: row.date,
                workout_id: row.workout_id,
                sets: sets
                    .into_iter()
                    .map(|s| SetHistoryEntry {
                        set_number: s.set_number,
                        reps: s.actual_reps,
                        weight: s.actual_weight,
                        is_warmup: s.is_warmup,
                    })
                    .collect(),
                max_weight,
                total_volume,
                estimated_1rm,
            });
        }

        // Get personal records
        let prs = PersonalRecordRepository::find_by_exercise(pool, user_id, exercise_id).await?;
        let personal_records = prs
            .into_iter()
            .map(|pr| PersonalRecordResponse {
                id: pr.id,
                exercise_template_id: pr.exercise_template_id,
                exercise_name: pr.exercise_name,
                type_: pr.type_,
                value: pr.value,
                reps: pr.reps,
                achieved_at: pr.achieved_at,
                workout_id: pr.workout_id,
            })
            .collect();

        Ok(ExerciseProgressResponse {
            exercise_template_id: exercise_id.to_string(),
            exercise_name,
            history,
            personal_records,
        })
    }
}

#[derive(Debug, sqlx::FromRow)]
struct WeekVolumeRow {
    week_start: NaiveDate,
    total_volume: f64,
    workout_count: i32,
}

#[derive(Debug, sqlx::FromRow)]
struct MuscleGroupRow {
    muscle_group: MuscleGroup,
    set_count: i64,
    volume: f64,
}

#[derive(Debug, sqlx::FromRow)]
struct ExerciseHistoryRow {
    workout_id: Uuid,
    date: chrono::DateTime<Utc>,
    workout_exercise_id: Uuid,
}

#[derive(Debug, sqlx::FromRow)]
struct SetRow {
    set_number: i32,
    actual_reps: Option<i32>,
    actual_weight: Option<f64>,
    is_warmup: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== Streak Calculation Tests ====================

    #[test]
    fn test_streaks_empty_dates() {
        let dates: Vec<NaiveDate> = vec![];
        let today = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap();

        let (current, longest) = calculate_streaks_from_dates(&dates, today);

        assert_eq!(current, 0);
        assert_eq!(longest, 0);
    }

    #[test]
    fn test_streaks_single_workout_today() {
        let today = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap();
        let dates = vec![today];

        let (current, longest) = calculate_streaks_from_dates(&dates, today);

        assert_eq!(current, 1);
        assert_eq!(longest, 1);
    }

    #[test]
    fn test_streaks_single_workout_yesterday() {
        let today = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap();
        let yesterday = NaiveDate::from_ymd_opt(2024, 1, 14).unwrap();
        let dates = vec![yesterday];

        let (current, longest) = calculate_streaks_from_dates(&dates, today);

        assert_eq!(current, 1);
        assert_eq!(longest, 1);
    }

    #[test]
    fn test_streaks_workout_two_days_ago_breaks_current() {
        let today = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap();
        let two_days_ago = NaiveDate::from_ymd_opt(2024, 1, 13).unwrap();
        let dates = vec![two_days_ago];

        let (current, longest) = calculate_streaks_from_dates(&dates, today);

        assert_eq!(current, 0);
        assert_eq!(longest, 1);
    }

    #[test]
    fn test_streaks_consecutive_days() {
        let today = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap();
        // Workouts on Jan 15, 14, 13, 12 (4-day streak)
        let dates = vec![
            NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
            NaiveDate::from_ymd_opt(2024, 1, 14).unwrap(),
            NaiveDate::from_ymd_opt(2024, 1, 13).unwrap(),
            NaiveDate::from_ymd_opt(2024, 1, 12).unwrap(),
        ];

        let (current, longest) = calculate_streaks_from_dates(&dates, today);

        assert_eq!(current, 4);
        assert_eq!(longest, 4);
    }

    #[test]
    fn test_streaks_gap_in_middle() {
        let today = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap();
        // Current: Jan 15, 14 (2 days)
        // Past: Jan 10, 9, 8 (3 days)
        let dates = vec![
            NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
            NaiveDate::from_ymd_opt(2024, 1, 14).unwrap(),
            // Gap here
            NaiveDate::from_ymd_opt(2024, 1, 10).unwrap(),
            NaiveDate::from_ymd_opt(2024, 1, 9).unwrap(),
            NaiveDate::from_ymd_opt(2024, 1, 8).unwrap(),
        ];

        let (current, longest) = calculate_streaks_from_dates(&dates, today);

        assert_eq!(current, 2);
        assert_eq!(longest, 3);
    }

    #[test]
    fn test_streaks_past_streak_longer_than_current() {
        let today = NaiveDate::from_ymd_opt(2024, 1, 20).unwrap();
        // Current: Just today (1 day)
        // Past: Jan 10-15 (6 days)
        let dates = vec![
            NaiveDate::from_ymd_opt(2024, 1, 20).unwrap(),
            // Gap
            NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
            NaiveDate::from_ymd_opt(2024, 1, 14).unwrap(),
            NaiveDate::from_ymd_opt(2024, 1, 13).unwrap(),
            NaiveDate::from_ymd_opt(2024, 1, 12).unwrap(),
            NaiveDate::from_ymd_opt(2024, 1, 11).unwrap(),
            NaiveDate::from_ymd_opt(2024, 1, 10).unwrap(),
        ];

        let (current, longest) = calculate_streaks_from_dates(&dates, today);

        assert_eq!(current, 1);
        assert_eq!(longest, 6);
    }

    #[test]
    fn test_streaks_no_current_streak() {
        let today = NaiveDate::from_ymd_opt(2024, 1, 20).unwrap();
        // Last workout was Jan 15 (5 days ago) - no current streak
        let dates = vec![
            NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
            NaiveDate::from_ymd_opt(2024, 1, 14).unwrap(),
            NaiveDate::from_ymd_opt(2024, 1, 13).unwrap(),
        ];

        let (current, longest) = calculate_streaks_from_dates(&dates, today);

        assert_eq!(current, 0);
        assert_eq!(longest, 3);
    }

    // ==================== Percentage Calculation Tests ====================

    #[test]
    fn test_calculate_percentage_normal() {
        let percentage = calculate_percentage(25, 100);
        assert!((percentage - 25.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_percentage_half() {
        let percentage = calculate_percentage(50, 100);
        assert!((percentage - 50.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_percentage_full() {
        let percentage = calculate_percentage(100, 100);
        assert!((percentage - 100.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_percentage_zero_part() {
        let percentage = calculate_percentage(0, 100);
        assert!((percentage - 0.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_percentage_zero_total() {
        let percentage = calculate_percentage(50, 0);
        assert!((percentage - 0.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_percentage_both_zero() {
        let percentage = calculate_percentage(0, 0);
        assert!((percentage - 0.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_percentage_small_numbers() {
        let percentage = calculate_percentage(1, 3);
        assert!((percentage - 33.333).abs() < 0.01);
    }

    #[test]
    fn test_calculate_percentage_large_numbers() {
        let percentage = calculate_percentage(5000, 10000);
        assert!((percentage - 50.0).abs() < 0.01);
    }

    // ==================== Estimated 1RM Tests ====================

    #[test]
    fn test_estimate_1rm_single_rep() {
        let e1rm = estimate_1rm(100.0, 1).unwrap();
        assert!((e1rm - 100.0).abs() < 0.01);
    }

    #[test]
    fn test_estimate_1rm_five_reps() {
        let e1rm = estimate_1rm(100.0, 5).unwrap();
        let expected = 100.0 * (36.0 / 32.0);
        assert!((e1rm - expected).abs() < 0.01);
    }

    #[test]
    fn test_estimate_1rm_ten_reps() {
        let e1rm = estimate_1rm(100.0, 10).unwrap();
        let expected = 100.0 * (36.0 / 27.0);
        assert!((e1rm - expected).abs() < 0.01);
    }

    #[test]
    fn test_estimate_1rm_zero_reps() {
        let result = estimate_1rm(100.0, 0);
        assert!(result.is_none());
    }

    #[test]
    fn test_estimate_1rm_over_twelve() {
        let result = estimate_1rm(100.0, 15);
        assert!(result.is_none());
    }

    #[test]
    fn test_estimate_1rm_negative_reps() {
        let result = estimate_1rm(100.0, -1);
        assert!(result.is_none());
    }

    // ==================== Model Serialization Tests ====================

    #[test]
    fn test_muscle_group_serialization() {
        let chest = MuscleGroup::Chest;
        let back = MuscleGroup::Back;
        let quads = MuscleGroup::Quads;

        assert_eq!(serde_json::to_string(&chest).unwrap(), "\"chest\"");
        assert_eq!(serde_json::to_string(&back).unwrap(), "\"back\"");
        assert_eq!(serde_json::to_string(&quads).unwrap(), "\"quads\"");
    }

    #[test]
    fn test_muscle_group_deserialization() {
        let chest: MuscleGroup = serde_json::from_str("\"chest\"").unwrap();
        let shoulders: MuscleGroup = serde_json::from_str("\"shoulders\"").unwrap();
        let biceps: MuscleGroup = serde_json::from_str("\"biceps\"").unwrap();

        assert_eq!(chest, MuscleGroup::Chest);
        assert_eq!(shoulders, MuscleGroup::Shoulders);
        assert_eq!(biceps, MuscleGroup::Biceps);
    }

    // ==================== Week Calculation Tests ====================

    #[test]
    fn test_week_start_calculation_monday() {
        let monday = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(); // This is a Monday
        let days_from_monday = monday.weekday().num_days_from_monday();
        assert_eq!(days_from_monday, 0);
    }

    #[test]
    fn test_week_start_calculation_sunday() {
        let sunday = NaiveDate::from_ymd_opt(2024, 1, 21).unwrap(); // This is a Sunday
        let days_from_monday = sunday.weekday().num_days_from_monday();
        assert_eq!(days_from_monday, 6);
    }

    #[test]
    fn test_week_start_calculation_wednesday() {
        let wednesday = NaiveDate::from_ymd_opt(2024, 1, 17).unwrap(); // This is a Wednesday
        let days_from_monday = wednesday.weekday().num_days_from_monday();
        assert_eq!(days_from_monday, 2);
    }
}
