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
    DashboardSummary, ExerciseHistoryEntry, ExerciseOverloadSuggestion, ExercisePlateauAlert,
    ExerciseProgressResponse, MuscleGroupData, MuscleGroupDistribution,
    OverloadSuggestionsResponse, PersonalRecordResponse, PlateauAlertResponse, SetHistoryEntry,
    StatisticsQuery, SuggestionConfidence, SuggestionType, WeekVolume, WeeklyVolumeResponse,
};
use crate::error::AppError;
use crate::models::{MuscleGroup, WeightUnit};
use crate::repositories::{PersonalRecordRepository, SettingsRepository};

fn is_large_muscle_group(mg: &MuscleGroup) -> bool {
    matches!(
        mg,
        MuscleGroup::Chest
            | MuscleGroup::Back
            | MuscleGroup::Quads
            | MuscleGroup::Hamstrings
            | MuscleGroup::Glutes
            | MuscleGroup::Lats
    )
}

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

        // Run all 6 independent queries in parallel
        let (
            total_workouts_r,
            workouts_this_week_r,
            volume_r,
            sets_reps_r,
            streaks_r,
            recent_prs_r,
        ) = tokio::join!(
            sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM workouts WHERE user_id = $1 AND status = 'completed'",
            )
            .bind(user_id)
            .fetch_one(pool),
            sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM workouts WHERE user_id = $1 AND status = 'completed' AND started_at >= $2",
            )
            .bind(user_id)
            .bind(week_start)
            .fetch_one(pool),
            sqlx::query_as::<_, (f64, f64)>(
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
            .fetch_one(pool),
            sqlx::query_as::<_, (i64, i64)>(
                r#"
                SELECT
                    COALESCE(SUM(total_sets), 0)::bigint,
                    COALESCE(SUM(total_reps), 0)::bigint
                FROM workouts
                WHERE user_id = $1 AND status = 'completed'
                "#,
            )
            .bind(user_id)
            .fetch_one(pool),
            Self::calculate_streaks(pool, user_id),
            PersonalRecordRepository::find_recent(pool, user_id, 5),
        );

        let total_workouts = total_workouts_r?;
        let workouts_this_week = workouts_this_week_r?;
        let (total_volume, volume_this_week) = volume_r?;
        let (total_sets, total_reps) = sets_reps_r?;
        let (current_streak, longest_streak) = streaks_r?;
        let recent_prs = recent_prs_r?
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
        // Get exercise name (cached — exercise templates are static)
        let exercise_name = if let Some(cached) = crate::cache::get_exercise_name(exercise_id) {
            cached
        } else {
            let name = sqlx::query_scalar::<_, String>(
                "SELECT name FROM exercise_templates WHERE id = $1",
            )
            .bind(exercise_id)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| AppError::NotFound("Exercise not found".to_string()))?;
            crate::cache::set_exercise_name(exercise_id.to_string(), name.clone());
            name
        };

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

        // Batch-fetch all sets for all history rows in a single query
        let exercise_ids: Vec<Uuid> = history_rows.iter().map(|r| r.workout_exercise_id).collect();
        let all_sets = Self::batch_fetch_completed_sets(pool, &exercise_ids).await?;

        let mut history = Vec::new();
        for row in history_rows {
            let sets = all_sets
                .get(&row.workout_exercise_id)
                .cloned()
                .unwrap_or_default();

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

    #[instrument(skip(pool), fields(user_id = %user_id))]
    pub async fn get_progressive_overload_suggestions(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<OverloadSuggestionsResponse, AppError> {
        info!("Calculating progressive overload suggestions");

        // Get user's weight unit (cached with 60s TTL)
        let settings = if let Some(cached) = crate::cache::get_settings(user_id) {
            cached
        } else {
            let s = SettingsRepository::get_or_create(pool, user_id).await?;
            crate::cache::set_settings(user_id, s.clone());
            s
        };
        let large_increment = match settings.weight_unit {
            WeightUnit::Kg => 2.5,
            WeightUnit::Lbs => 5.0,
        };
        let small_increment = match settings.weight_unit {
            WeightUnit::Kg => 1.25,
            WeightUnit::Lbs => 2.5,
        };
        let unit_label = match settings.weight_unit {
            WeightUnit::Kg => "kg",
            WeightUnit::Lbs => "lbs",
        };

        // Get all exercises the user has completed
        let exercises = sqlx::query_as::<_, (String, String)>(
            r#"
            SELECT DISTINCT we.exercise_template_id, we.exercise_name
            FROM workout_exercises we
            JOIN workouts w ON w.id = we.workout_id
            JOIN workout_sets ws ON ws.workout_exercise_id = we.id
            WHERE w.user_id = $1
                AND w.status = 'completed'
                AND ws.is_completed = true
                AND ws.is_warmup = false
            ORDER BY we.exercise_name
            "#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        let mut suggestions = Vec::new();

        // Batch-fetch muscle groups for all exercises
        let all_exercise_ids: Vec<String> = exercises.iter().map(|(id, _)| id.clone()).collect();
        let muscle_group_rows = sqlx::query_as::<_, (String, MuscleGroup)>(
            "SELECT exercise_id, muscle_group FROM exercise_muscle_groups WHERE exercise_id = ANY($1)",
        )
        .bind(&all_exercise_ids)
        .fetch_all(pool)
        .await?;
        let mut muscle_group_map: std::collections::HashMap<String, Vec<MuscleGroup>> =
            std::collections::HashMap::new();
        for (eid, mg) in muscle_group_rows {
            muscle_group_map.entry(eid).or_default().push(mg);
        }

        // Batch-fetch last 3 sessions for all exercises using a window function
        let all_sessions = sqlx::query_as::<_, ExerciseHistoryRowWithTemplate>(
            r#"
            SELECT workout_id, date, workout_exercise_id, exercise_template_id
            FROM (
                SELECT
                    w.id as workout_id,
                    w.started_at as date,
                    we.id as workout_exercise_id,
                    we.exercise_template_id,
                    ROW_NUMBER() OVER (PARTITION BY we.exercise_template_id ORDER BY w.started_at DESC) as rn
                FROM workouts w
                JOIN workout_exercises we ON we.workout_id = w.id
                WHERE w.user_id = $1
                    AND w.status = 'completed'
                    AND we.exercise_template_id = ANY($2)
            ) sub
            WHERE rn <= 3
            "#,
        )
        .bind(user_id)
        .bind(&all_exercise_ids)
        .fetch_all(pool)
        .await?;

        // Group sessions by exercise template id
        let mut sessions_by_exercise: std::collections::HashMap<String, Vec<ExerciseHistoryRow>> =
            std::collections::HashMap::new();
        let mut all_session_exercise_ids: Vec<Uuid> = Vec::new();
        for s in &all_sessions {
            all_session_exercise_ids.push(s.workout_exercise_id);
            sessions_by_exercise
                .entry(s.exercise_template_id.clone())
                .or_default()
                .push(ExerciseHistoryRow {
                    workout_id: s.workout_id,
                    date: s.date,
                    workout_exercise_id: s.workout_exercise_id,
                });
        }

        // Batch-fetch all working sets for all sessions in one query
        let all_sets_map = Self::batch_fetch_working_sets(pool, &all_session_exercise_ids).await?;

        for (exercise_id, exercise_name) in exercises {
            let muscle_groups = muscle_group_map.get(&exercise_id).cloned().unwrap_or_default();
            let is_large = muscle_groups.iter().any(is_large_muscle_group);
            let increment = if is_large { large_increment } else { small_increment };

            let sessions = sessions_by_exercise.get(&exercise_id).cloned().unwrap_or_default();

            if sessions.is_empty() {
                continue;
            }

            let session_count = sessions.len();

            // For each session, use pre-fetched working sets
            let mut session_data: Vec<SessionAnalysis> = Vec::new();
            for session in &sessions {
                let sets = all_sets_map
                    .get(&session.workout_exercise_id)
                    .cloned()
                    .unwrap_or_default();

                if sets.is_empty() {
                    continue;
                }

                let max_weight = sets
                    .iter()
                    .filter_map(|s| s.actual_weight)
                    .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
                    .unwrap_or(0.0);

                // Get sets at the max weight
                let sets_at_max: Vec<&SetRow> = sets
                    .iter()
                    .filter(|s| s.actual_weight == Some(max_weight))
                    .collect();

                let avg_reps_at_max = if !sets_at_max.is_empty() {
                    let total_reps: i32 = sets_at_max
                        .iter()
                        .filter_map(|s| s.actual_reps)
                        .sum();
                    total_reps / sets_at_max.len() as i32
                } else {
                    0
                };

                // Check if all sets met their target reps
                // We consider targets met if all sets have actual reps > 0
                let all_targets_met = sets
                    .iter()
                    .all(|s| s.actual_reps.unwrap_or(0) > 0);

                session_data.push(SessionAnalysis {
                    max_weight,
                    avg_reps: avg_reps_at_max,
                    all_targets_met,
                });
            }

            if session_data.is_empty() {
                continue;
            }

            let last = &session_data[0];
            let current_weight = last.max_weight;
            let current_reps = last.avg_reps;

            let confidence = match session_count {
                1 => SuggestionConfidence::Low,
                2 => SuggestionConfidence::Medium,
                _ => SuggestionConfidence::High,
            };

            let suggestion = if session_data.len() >= 2 {
                let prev = &session_data[1];
                // Check if last 2 sessions were at the same weight and both met targets
                let consistent = last.all_targets_met
                    && prev.all_targets_met
                    && (last.max_weight - prev.max_weight).abs() < 0.01;

                if is_large {
                    // Large-muscle exercises: favor weight increases
                    if consistent {
                        let suggested = current_weight + increment;
                        ExerciseOverloadSuggestion {
                            exercise_template_id: exercise_id.clone(),
                            exercise_name: exercise_name.clone(),
                            suggestion_type: SuggestionType::IncreaseWeight,
                            suggested_weight: Some(suggested),
                            suggested_reps: None,
                            current_weight,
                            current_reps,
                            reason: format!(
                                "Completed all sets at {}{} in last 2 sessions. Try {}{}!",
                                current_weight, unit_label, suggested, unit_label
                            ),
                            confidence,
                        }
                    } else if last.all_targets_met {
                        let suggested_reps = (current_reps + 1).min(15);
                        ExerciseOverloadSuggestion {
                            exercise_template_id: exercise_id.clone(),
                            exercise_name: exercise_name.clone(),
                            suggestion_type: SuggestionType::IncreaseReps,
                            suggested_weight: None,
                            suggested_reps: Some(suggested_reps),
                            current_weight,
                            current_reps,
                            reason: format!(
                                "Good session! Try {} reps at {}{} next time.",
                                suggested_reps, current_weight, unit_label
                            ),
                            confidence,
                        }
                    } else {
                        ExerciseOverloadSuggestion {
                            exercise_template_id: exercise_id.clone(),
                            exercise_name: exercise_name.clone(),
                            suggestion_type: SuggestionType::Maintain,
                            suggested_weight: None,
                            suggested_reps: None,
                            current_weight,
                            current_reps,
                            reason: format!(
                                "Keep working at {}{} x {} reps.",
                                current_weight, unit_label, current_reps
                            ),
                            confidence,
                        }
                    }
                } else {
                    // Small-muscle exercises: favor rep increases first
                    if consistent && current_reps < 15 {
                        let suggested_reps = (current_reps + 1).min(15);
                        ExerciseOverloadSuggestion {
                            exercise_template_id: exercise_id.clone(),
                            exercise_name: exercise_name.clone(),
                            suggestion_type: SuggestionType::IncreaseReps,
                            suggested_weight: None,
                            suggested_reps: Some(suggested_reps),
                            current_weight,
                            current_reps,
                            reason: format!(
                                "Isolation exercise — build reps before adding weight. Try {} reps at {}{}.",
                                suggested_reps, current_weight, unit_label
                            ),
                            confidence,
                        }
                    } else if consistent && current_reps >= 15 {
                        let suggested = current_weight + increment;
                        ExerciseOverloadSuggestion {
                            exercise_template_id: exercise_id.clone(),
                            exercise_name: exercise_name.clone(),
                            suggestion_type: SuggestionType::IncreaseWeight,
                            suggested_weight: Some(suggested),
                            suggested_reps: None,
                            current_weight,
                            current_reps,
                            reason: format!(
                                "Hit {} reps consistently — time for a small weight jump. Try {}{}!",
                                current_reps, suggested, unit_label
                            ),
                            confidence,
                        }
                    } else if last.all_targets_met {
                        ExerciseOverloadSuggestion {
                            exercise_template_id: exercise_id.clone(),
                            exercise_name: exercise_name.clone(),
                            suggestion_type: SuggestionType::Maintain,
                            suggested_weight: None,
                            suggested_reps: None,
                            current_weight,
                            current_reps,
                            reason: format!(
                                "Good session at {}{} x {} reps. Build more consistency before progressing.",
                                current_weight, unit_label, current_reps
                            ),
                            confidence,
                        }
                    } else {
                        ExerciseOverloadSuggestion {
                            exercise_template_id: exercise_id.clone(),
                            exercise_name: exercise_name.clone(),
                            suggestion_type: SuggestionType::Maintain,
                            suggested_weight: None,
                            suggested_reps: None,
                            current_weight,
                            current_reps,
                            reason: format!(
                                "Keep working at {}{} x {} reps.",
                                current_weight, unit_label, current_reps
                            ),
                            confidence,
                        }
                    }
                }
            } else {
                // Only 1 session
                ExerciseOverloadSuggestion {
                    exercise_template_id: exercise_id.clone(),
                    exercise_name: exercise_name.clone(),
                    suggestion_type: SuggestionType::Maintain,
                    suggested_weight: None,
                    suggested_reps: None,
                    current_weight,
                    current_reps,
                    reason: "Need more workout data for a suggestion.".to_string(),
                    confidence,
                }
            };

            suggestions.push(suggestion);
        }

        info!("Generated {} overload suggestions", suggestions.len());
        Ok(OverloadSuggestionsResponse { suggestions })
    }

    #[instrument(skip(pool), fields(user_id = %user_id))]
    pub async fn get_plateau_alerts(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<PlateauAlertResponse, AppError> {
        info!("Calculating plateau alerts");

        let three_weeks_ago = Utc::now() - Duration::weeks(3);

        // Get all exercises the user has completed
        let exercises = sqlx::query_as::<_, (String, String)>(
            r#"
            SELECT DISTINCT we.exercise_template_id, we.exercise_name
            FROM workout_exercises we
            JOIN workouts w ON w.id = we.workout_id
            JOIN workout_sets ws ON ws.workout_exercise_id = we.id
            WHERE w.user_id = $1
                AND w.status = 'completed'
                AND ws.is_completed = true
                AND ws.is_warmup = false
            ORDER BY we.exercise_name
            "#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        // Batch-fetch all sessions for all exercises
        let all_exercise_ids: Vec<String> = exercises.iter().map(|(id, _)| id.clone()).collect();
        let all_sessions = sqlx::query_as::<_, ExerciseHistoryRowWithTemplate>(
            r#"
            SELECT
                w.id as workout_id,
                w.started_at as date,
                we.id as workout_exercise_id,
                we.exercise_template_id
            FROM workouts w
            JOIN workout_exercises we ON we.workout_id = w.id
            WHERE w.user_id = $1
                AND w.status = 'completed'
                AND we.exercise_template_id = ANY($2)
            ORDER BY w.started_at DESC
            "#,
        )
        .bind(user_id)
        .bind(&all_exercise_ids)
        .fetch_all(pool)
        .await?;

        // Group sessions by exercise template id
        let mut sessions_by_exercise: std::collections::HashMap<String, Vec<ExerciseHistoryRow>> =
            std::collections::HashMap::new();
        let mut all_workout_exercise_ids: Vec<Uuid> = Vec::new();
        for s in &all_sessions {
            all_workout_exercise_ids.push(s.workout_exercise_id);
            sessions_by_exercise
                .entry(s.exercise_template_id.clone())
                .or_default()
                .push(ExerciseHistoryRow {
                    workout_id: s.workout_id,
                    date: s.date,
                    workout_exercise_id: s.workout_exercise_id,
                });
        }

        // Batch-fetch all working sets in one query
        let all_sets_map = Self::batch_fetch_working_sets(pool, &all_workout_exercise_ids).await?;

        let mut alerts = Vec::new();

        for (exercise_id, exercise_name) in exercises {
            let sessions = sessions_by_exercise.get(&exercise_id).cloned().unwrap_or_default();

            if sessions.len() < 2 {
                continue;
            }

            // Split into recent (last 3 weeks) and older
            let mut recent_sessions = Vec::new();
            let mut older_sessions = Vec::new();
            for session in &sessions {
                if session.date >= three_weeks_ago {
                    recent_sessions.push(session);
                } else {
                    older_sessions.push(session);
                }
            }

            if recent_sessions.is_empty() || older_sessions.is_empty() {
                continue;
            }

            // Get max weight from recent sessions (using pre-fetched sets)
            let mut recent_max: f64 = 0.0;
            for session in &recent_sessions {
                let sets = all_sets_map
                    .get(&session.workout_exercise_id)
                    .cloned()
                    .unwrap_or_default();

                let session_max = sets
                    .iter()
                    .filter_map(|s| s.actual_weight)
                    .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
                    .unwrap_or(0.0);
                if session_max > recent_max {
                    recent_max = session_max;
                }
            }

            // Get max weight and date from older sessions (using pre-fetched sets)
            let mut older_max: f64 = 0.0;
            let mut older_max_date: Option<NaiveDate> = None;
            for session in &older_sessions {
                let sets = all_sets_map
                    .get(&session.workout_exercise_id)
                    .cloned()
                    .unwrap_or_default();

                let session_max = sets
                    .iter()
                    .filter_map(|s| s.actual_weight)
                    .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
                    .unwrap_or(0.0);
                if session_max > older_max {
                    older_max = session_max;
                    older_max_date = Some(session.date.date_naive());
                }
            }

            // Plateau: recent max hasn't exceeded older max
            if recent_max <= older_max && older_max > 0.0 {
                let weeks_since = older_max_date
                    .map(|d| {
                        let days = (Utc::now().date_naive() - d).num_days();
                        (days / 7).max(3) as i32
                    })
                    .unwrap_or(3);

                let suggestion = if weeks_since >= 6 {
                    format!(
                        "Consider a deload week or try a variation of this exercise."
                    )
                } else {
                    format!(
                        "Try adjusting rep ranges, adding pause reps, or changing tempo."
                    )
                };

                alerts.push(ExercisePlateauAlert {
                    exercise_template_id: exercise_id,
                    exercise_name,
                    weeks_since_progress: weeks_since,
                    last_max_weight: older_max,
                    current_max_weight: recent_max,
                    last_progress_date: older_max_date,
                    suggestion,
                });
            }
        }

        info!("Found {} plateau alerts", alerts.len());
        Ok(PlateauAlertResponse { alerts })
    }

    /// Batch-fetch completed sets for multiple workout_exercise_ids (includes warmup sets).
    /// Used by get_exercise_progress which needs all completed sets including warmups.
    async fn batch_fetch_completed_sets(
        pool: &PgPool,
        exercise_ids: &[Uuid],
    ) -> Result<std::collections::HashMap<Uuid, Vec<SetRow>>, AppError> {
        if exercise_ids.is_empty() {
            return Ok(std::collections::HashMap::new());
        }

        let rows = sqlx::query_as::<_, SetRowWithExerciseId>(
            r#"
            SELECT workout_exercise_id, set_number, actual_reps, actual_weight, is_warmup
            FROM workout_sets
            WHERE workout_exercise_id = ANY($1) AND is_completed = true
            ORDER BY workout_exercise_id, set_number
            "#,
        )
        .bind(exercise_ids)
        .fetch_all(pool)
        .await?;

        let mut map: std::collections::HashMap<Uuid, Vec<SetRow>> =
            std::collections::HashMap::new();
        for row in rows {
            map.entry(row.workout_exercise_id).or_default().push(SetRow {
                set_number: row.set_number,
                actual_reps: row.actual_reps,
                actual_weight: row.actual_weight,
                is_warmup: row.is_warmup,
            });
        }

        Ok(map)
    }

    /// Batch-fetch completed working (non-warmup) sets for multiple workout_exercise_ids.
    /// Used by overload suggestions and plateau alerts.
    async fn batch_fetch_working_sets(
        pool: &PgPool,
        exercise_ids: &[Uuid],
    ) -> Result<std::collections::HashMap<Uuid, Vec<SetRow>>, AppError> {
        if exercise_ids.is_empty() {
            return Ok(std::collections::HashMap::new());
        }

        let rows = sqlx::query_as::<_, SetRowWithExerciseId>(
            r#"
            SELECT workout_exercise_id, set_number, actual_reps, actual_weight, is_warmup
            FROM workout_sets
            WHERE workout_exercise_id = ANY($1)
                AND is_completed = true
                AND is_warmup = false
            ORDER BY workout_exercise_id, set_number
            "#,
        )
        .bind(exercise_ids)
        .fetch_all(pool)
        .await?;

        let mut map: std::collections::HashMap<Uuid, Vec<SetRow>> =
            std::collections::HashMap::new();
        for row in rows {
            map.entry(row.workout_exercise_id).or_default().push(SetRow {
                set_number: row.set_number,
                actual_reps: row.actual_reps,
                actual_weight: row.actual_weight,
                is_warmup: row.is_warmup,
            });
        }

        Ok(map)
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

#[derive(Debug, Clone, sqlx::FromRow)]
struct ExerciseHistoryRow {
    workout_id: Uuid,
    date: chrono::DateTime<Utc>,
    workout_exercise_id: Uuid,
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct SetRow {
    set_number: i32,
    actual_reps: Option<i32>,
    actual_weight: Option<f64>,
    is_warmup: bool,
}

struct SessionAnalysis {
    max_weight: f64,
    avg_reps: i32,
    all_targets_met: bool,
}

#[derive(Debug, sqlx::FromRow)]
struct SetRowWithExerciseId {
    workout_exercise_id: Uuid,
    set_number: i32,
    actual_reps: Option<i32>,
    actual_weight: Option<f64>,
    is_warmup: bool,
}

#[derive(Debug, sqlx::FromRow)]
struct ExerciseHistoryRowWithTemplate {
    workout_id: Uuid,
    date: chrono::DateTime<Utc>,
    workout_exercise_id: Uuid,
    exercise_template_id: String,
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
