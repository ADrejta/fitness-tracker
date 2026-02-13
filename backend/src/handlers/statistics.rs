use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use sqlx::PgPool;
use tracing::{debug, error, info, instrument};
use validator::Validate;

use crate::dto::{
    DashboardSummary, ErrorResponse, ExerciseProgressResponse, ExercisesWithHistoryResponse,
    ExerciseWithHistorySummary, MuscleGroupDistribution, PersonalRecordResponse,
    PersonalRecordsListResponse, StatisticsQuery, WeeklyVolumeResponse,
};
use crate::error::AppError;
use crate::middleware::AuthUser;
use crate::repositories::PersonalRecordRepository;
use crate::services::StatisticsService;

#[utoipa::path(
    get,
    path = "/api/v1/statistics/summary",
    tag = "Statistics",
    responses(
        (status = 200, description = "Dashboard summary", body = DashboardSummary),
    ),
    security(("bearer_auth" = []))
)]
#[instrument(skip(pool), fields(user_id = %auth_user.user_id))]
pub async fn get_summary(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<DashboardSummary>, AppError> {
    info!("Fetching dashboard summary");

    let summary = StatisticsService::get_dashboard_summary(&pool, auth_user.user_id).await
        .map_err(|e| {
            error!("Failed to get dashboard summary: {:?}", e);
            e
        })?;

    debug!("Dashboard summary retrieved: {} total workouts, {} this week",
           summary.total_workouts, summary.workouts_this_week);

    Ok(Json(summary))
}

#[utoipa::path(
    get,
    path = "/api/v1/statistics/volume/weekly",
    tag = "Statistics",
    params(StatisticsQuery),
    responses(
        (status = 200, description = "Weekly volume data", body = WeeklyVolumeResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_weekly_volume(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<StatisticsQuery>,
) -> Result<Json<WeeklyVolumeResponse>, AppError> {
    query
        .validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let response = StatisticsService::get_weekly_volume(&pool, auth_user.user_id, &query).await?;
    Ok(Json(response))
}

#[utoipa::path(
    get,
    path = "/api/v1/statistics/muscle-groups",
    tag = "Statistics",
    params(StatisticsQuery),
    responses(
        (status = 200, description = "Muscle group distribution", body = MuscleGroupDistribution),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_muscle_group_distribution(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<StatisticsQuery>,
) -> Result<Json<MuscleGroupDistribution>, AppError> {
    query
        .validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let response =
        StatisticsService::get_muscle_group_distribution(&pool, auth_user.user_id, &query).await?;
    Ok(Json(response))
}

#[utoipa::path(
    get,
    path = "/api/v1/statistics/exercises/{exercise_id}/progress",
    tag = "Statistics",
    params(("exercise_id" = String, Path, description = "Exercise template ID")),
    responses(
        (status = 200, description = "Exercise progress data", body = ExerciseProgressResponse),
        (status = 404, description = "Exercise not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_exercise_progress(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(exercise_id): Path<String>,
) -> Result<Json<ExerciseProgressResponse>, AppError> {
    let response =
        StatisticsService::get_exercise_progress(&pool, auth_user.user_id, &exercise_id).await?;
    Ok(Json(response))
}

#[utoipa::path(
    get,
    path = "/api/v1/personal-records",
    tag = "Personal Records",
    responses(
        (status = 200, description = "All personal records", body = PersonalRecordsListResponse),
    ),
    security(("bearer_auth" = []))
)]
#[instrument(skip(pool), fields(user_id = %auth_user.user_id))]
pub async fn get_personal_records(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<PersonalRecordsListResponse>, AppError> {
    info!("Fetching all personal records");

    let records = PersonalRecordRepository::find_all(&pool, auth_user.user_id).await?;

    let records = records
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

    Ok(Json(PersonalRecordsListResponse { records }))
}

#[utoipa::path(
    get,
    path = "/api/v1/statistics/exercises-with-history",
    tag = "Statistics",
    responses(
        (status = 200, description = "Exercises that have workout history", body = ExercisesWithHistoryResponse),
    ),
    security(("bearer_auth" = []))
)]
#[instrument(skip(pool), fields(user_id = %auth_user.user_id))]
pub async fn get_exercises_with_history(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<ExercisesWithHistoryResponse>, AppError> {
    info!("Fetching exercises with workout history");

    let exercises = sqlx::query_as::<_, (String, String, i64)>(
        r#"
        SELECT
            we.exercise_template_id,
            we.exercise_name,
            COUNT(DISTINCT w.id) as workout_count
        FROM workout_exercises we
        JOIN workouts w ON w.id = we.workout_id
        JOIN workout_sets ws ON ws.workout_exercise_id = we.id
        WHERE w.user_id = $1
            AND w.status = 'completed'
            AND ws.is_completed = true
            AND ws.is_warmup = false
        GROUP BY we.exercise_template_id, we.exercise_name
        ORDER BY we.exercise_name
        "#,
    )
    .bind(auth_user.user_id)
    .fetch_all(&pool)
    .await?;

    let exercises = exercises
        .into_iter()
        .map(|(exercise_template_id, exercise_name, workout_count)| ExerciseWithHistorySummary {
            exercise_template_id,
            exercise_name,
            workout_count,
        })
        .collect();

    Ok(Json(ExercisesWithHistoryResponse { exercises }))
}
