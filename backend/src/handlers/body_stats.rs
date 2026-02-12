use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

use crate::dto::{
    BodyMeasurementResponse, CreateGoalRequest, CreateMeasurementRequest, GoalProgressResponse,
    GoalResponse, MeasurementQuery, MeasurementTrendResponse, UpdateGoalRequest,
    UpdateMeasurementRequest,
};
use crate::error::AppError;
use crate::middleware::AuthUser;
use crate::models::{BodyMeasurement, GoalType};
use crate::repositories::BodyStatsRepository;

// Measurement handlers
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

pub async fn list_measurements(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<MeasurementQuery>,
) -> Result<Json<MeasurementTrendResponse>, AppError> {
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

pub async fn update_measurement(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMeasurementRequest>,
) -> Result<Json<BodyMeasurementResponse>, AppError> {
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

pub async fn delete_measurement(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<(), AppError> {
    BodyStatsRepository::delete_measurement(&pool, id, auth_user.user_id).await
}

// Goal handlers
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

pub async fn update_goal(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateGoalRequest>,
) -> Result<Json<GoalResponse>, AppError> {
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

pub async fn delete_goal(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<(), AppError> {
    BodyStatsRepository::delete_goal(&pool, id, auth_user.user_id).await
}

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
