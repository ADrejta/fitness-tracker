use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

use crate::dto::{
    BodyMeasurementResponse, CreateGoalRequest, CreateMeasurementRequest, ErrorResponse,
    GoalProgressResponse, GoalResponse, MeasurementQuery, MeasurementTrendResponse,
    UpdateGoalRequest, UpdateMeasurementRequest,
};
use crate::error::AppError;
use crate::middleware::AuthUser;
use crate::models::{BodyMeasurement, GoalType};
use crate::repositories::BodyStatsRepository;

// Measurement handlers

#[utoipa::path(
    post,
    path = "/api/v1/body-stats/measurements",
    tag = "Body Stats",
    request_body = CreateMeasurementRequest,
    responses(
        (status = 200, description = "Measurement created", body = BodyMeasurementResponse),
        (status = 400, description = "Validation error", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn create_measurement(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Json(req): Json<CreateMeasurementRequest>,
) -> Result<Json<BodyMeasurementResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let measurement = BodyStatsRepository::create_measurement(
        &pool,
        auth_user.user_id,
        req.date,
        req.weight,
        req.body_fat_percentage,
        req.chest,
        req.waist,
        req.hips,
        req.left_bicep,
        req.right_bicep,
        req.left_thigh,
        req.right_thigh,
        req.neck,
        req.shoulders,
        req.left_calf,
        req.right_calf,
        req.left_forearm,
        req.right_forearm,
        req.notes.as_deref(),
    )
    .await?;

    Ok(Json(measurement_to_response(measurement)))
}

#[utoipa::path(
    get,
    path = "/api/v1/body-stats/measurements",
    tag = "Body Stats",
    params(MeasurementQuery),
    responses(
        (status = 200, description = "List of measurements", body = MeasurementTrendResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_measurements(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<MeasurementQuery>,
) -> Result<Json<MeasurementTrendResponse>, AppError> {
    query
        .validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let (measurements, total) =
        BodyStatsRepository::find_measurements(&pool, auth_user.user_id, &query).await?;

    Ok(Json(MeasurementTrendResponse {
        measurements: measurements
            .into_iter()
            .map(measurement_to_response)
            .collect(),
        total,
    }))
}

#[utoipa::path(
    get,
    path = "/api/v1/body-stats/measurements/{id}",
    tag = "Body Stats",
    params(("id" = Uuid, Path, description = "Measurement ID")),
    responses(
        (status = 200, description = "Measurement details", body = BodyMeasurementResponse),
        (status = 404, description = "Measurement not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_measurement(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<BodyMeasurementResponse>, AppError> {
    let measurement = BodyStatsRepository::find_measurement_by_id(&pool, id, auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Measurement not found".to_string()))?;

    Ok(Json(measurement_to_response(measurement)))
}

#[utoipa::path(
    patch,
    path = "/api/v1/body-stats/measurements/{id}",
    tag = "Body Stats",
    params(("id" = Uuid, Path, description = "Measurement ID")),
    request_body = UpdateMeasurementRequest,
    responses(
        (status = 200, description = "Measurement updated", body = BodyMeasurementResponse),
        (status = 404, description = "Measurement not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn update_measurement(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMeasurementRequest>,
) -> Result<Json<BodyMeasurementResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let measurement = BodyStatsRepository::update_measurement(
        &pool,
        id,
        auth_user.user_id,
        req.date,
        req.weight,
        req.body_fat_percentage,
        req.chest,
        req.waist,
        req.hips,
        req.left_bicep,
        req.right_bicep,
        req.left_thigh,
        req.right_thigh,
        req.neck,
        req.shoulders,
        req.left_calf,
        req.right_calf,
        req.left_forearm,
        req.right_forearm,
        req.notes.as_deref(),
    )
    .await?;

    Ok(Json(measurement_to_response(measurement)))
}

#[utoipa::path(
    delete,
    path = "/api/v1/body-stats/measurements/{id}",
    tag = "Body Stats",
    params(("id" = Uuid, Path, description = "Measurement ID")),
    responses(
        (status = 200, description = "Measurement deleted"),
        (status = 404, description = "Measurement not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn delete_measurement(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<(), AppError> {
    BodyStatsRepository::delete_measurement(&pool, id, auth_user.user_id).await
}

// Goal handlers

#[utoipa::path(
    post,
    path = "/api/v1/body-stats/goals",
    tag = "Body Stats Goals",
    request_body = CreateGoalRequest,
    responses(
        (status = 200, description = "Goal created", body = GoalResponse),
        (status = 400, description = "Validation error", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn create_goal(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Json(req): Json<CreateGoalRequest>,
) -> Result<Json<GoalResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let goal = BodyStatsRepository::create_goal(
        &pool,
        auth_user.user_id,
        &req.type_,
        req.measurement_type.as_ref(),
        req.target_value,
        req.start_value,
        req.start_date,
        req.target_date,
    )
    .await?;

    Ok(Json(GoalResponse {
        id: goal.id,
        type_: goal.type_,
        measurement_type: goal.measurement_type,
        target_value: goal.target_value,
        start_value: goal.start_value,
        start_date: goal.start_date,
        target_date: goal.target_date,
        is_completed: goal.is_completed,
        completed_at: goal.completed_at,
    }))
}

#[utoipa::path(
    get,
    path = "/api/v1/body-stats/goals",
    tag = "Body Stats Goals",
    responses(
        (status = 200, description = "List of goals", body = Vec<GoalResponse>),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_goals(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<Vec<GoalResponse>>, AppError> {
    let goals = BodyStatsRepository::find_goals(&pool, auth_user.user_id).await?;

    Ok(Json(
        goals
            .into_iter()
            .map(|g| GoalResponse {
                id: g.id,
                type_: g.type_,
                measurement_type: g.measurement_type,
                target_value: g.target_value,
                start_value: g.start_value,
                start_date: g.start_date,
                target_date: g.target_date,
                is_completed: g.is_completed,
                completed_at: g.completed_at,
            })
            .collect(),
    ))
}

#[utoipa::path(
    get,
    path = "/api/v1/body-stats/goals/{id}",
    tag = "Body Stats Goals",
    params(("id" = Uuid, Path, description = "Goal ID")),
    responses(
        (status = 200, description = "Goal details", body = GoalResponse),
        (status = 404, description = "Goal not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_goal(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<GoalResponse>, AppError> {
    let goal = BodyStatsRepository::find_goal_by_id(&pool, id, auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Goal not found".to_string()))?;

    Ok(Json(GoalResponse {
        id: goal.id,
        type_: goal.type_,
        measurement_type: goal.measurement_type,
        target_value: goal.target_value,
        start_value: goal.start_value,
        start_date: goal.start_date,
        target_date: goal.target_date,
        is_completed: goal.is_completed,
        completed_at: goal.completed_at,
    }))
}

#[utoipa::path(
    patch,
    path = "/api/v1/body-stats/goals/{id}",
    tag = "Body Stats Goals",
    params(("id" = Uuid, Path, description = "Goal ID")),
    request_body = UpdateGoalRequest,
    responses(
        (status = 200, description = "Goal updated", body = GoalResponse),
        (status = 404, description = "Goal not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn update_goal(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateGoalRequest>,
) -> Result<Json<GoalResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let goal = BodyStatsRepository::update_goal(
        &pool,
        id,
        auth_user.user_id,
        req.target_value,
        req.target_date,
        req.is_completed,
    )
    .await?;

    Ok(Json(GoalResponse {
        id: goal.id,
        type_: goal.type_,
        measurement_type: goal.measurement_type,
        target_value: goal.target_value,
        start_value: goal.start_value,
        start_date: goal.start_date,
        target_date: goal.target_date,
        is_completed: goal.is_completed,
        completed_at: goal.completed_at,
    }))
}

#[utoipa::path(
    delete,
    path = "/api/v1/body-stats/goals/{id}",
    tag = "Body Stats Goals",
    params(("id" = Uuid, Path, description = "Goal ID")),
    responses(
        (status = 200, description = "Goal deleted"),
        (status = 404, description = "Goal not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn delete_goal(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<(), AppError> {
    BodyStatsRepository::delete_goal(&pool, id, auth_user.user_id).await
}

#[utoipa::path(
    get,
    path = "/api/v1/body-stats/goals/{id}/progress",
    tag = "Body Stats Goals",
    params(("id" = Uuid, Path, description = "Goal ID")),
    responses(
        (status = 200, description = "Goal progress", body = GoalProgressResponse),
        (status = 404, description = "Goal not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_goal_progress(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<GoalProgressResponse>, AppError> {
    let goal = BodyStatsRepository::find_goal_by_id(&pool, id, auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Goal not found".to_string()))?;

    let latest_measurement =
        BodyStatsRepository::get_latest_measurement(&pool, auth_user.user_id).await?;

    let current_value = latest_measurement.and_then(|m| match goal.type_ {
        GoalType::Weight => m.weight,
        GoalType::BodyFat => m.body_fat_percentage,
        GoalType::Measurement => goal.measurement_type.as_ref().and_then(|mt| {
            use crate::models::MeasurementType::*;
            match mt {
                Weight => m.weight,
                BodyFatPercentage => m.body_fat_percentage,
                Chest => m.chest,
                Waist => m.waist,
                Hips => m.hips,
                LeftBicep => m.left_bicep,
                RightBicep => m.right_bicep,
                LeftThigh => m.left_thigh,
                RightThigh => m.right_thigh,
                Neck => m.neck,
                Shoulders => m.shoulders,
                LeftCalf => m.left_calf,
                RightCalf => m.right_calf,
                LeftForearm => m.left_forearm,
                RightForearm => m.right_forearm,
            }
        }),
    });

    let progress_percentage = current_value.map_or(0.0, |current| {
        let total_change = (goal.target_value - goal.start_value).abs();
        if total_change == 0.0 {
            100.0
        } else {
            let achieved_change = (current - goal.start_value).abs();
            (achieved_change / total_change * 100.0).min(100.0)
        }
    });

    Ok(Json(GoalProgressResponse {
        goal: GoalResponse {
            id: goal.id,
            type_: goal.type_,
            measurement_type: goal.measurement_type,
            target_value: goal.target_value,
            start_value: goal.start_value,
            start_date: goal.start_date,
            target_date: goal.target_date,
            is_completed: goal.is_completed,
            completed_at: goal.completed_at,
        },
        current_value,
        progress_percentage,
    }))
}

fn measurement_to_response(m: BodyMeasurement) -> BodyMeasurementResponse {
    BodyMeasurementResponse {
        id: m.id,
        date: m.date,
        weight: m.weight,
        body_fat_percentage: m.body_fat_percentage,
        chest: m.chest,
        waist: m.waist,
        hips: m.hips,
        left_bicep: m.left_bicep,
        right_bicep: m.right_bicep,
        left_thigh: m.left_thigh,
        right_thigh: m.right_thigh,
        neck: m.neck,
        shoulders: m.shoulders,
        left_calf: m.left_calf,
        right_calf: m.right_calf,
        left_forearm: m.left_forearm,
        right_forearm: m.right_forearm,
        notes: m.notes,
    }
}
