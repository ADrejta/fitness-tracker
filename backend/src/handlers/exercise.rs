use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    Extension, Json,
};
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

use crate::dto::{
    CreateExerciseRequest, ErrorResponse, ExerciseQuery, ExerciseTemplateResponse,
    UpdateExerciseRequest,
};
use crate::error::AppError;
use crate::etag::{check_none_match, compute_etag};
use crate::middleware::AuthUser;
use crate::repositories::ExerciseRepository;

#[utoipa::path(
    get,
    path = "/api/v1/exercises",
    tag = "Exercises",
    params(ExerciseQuery),
    responses(
        (status = 200, description = "List of exercises", body = Vec<ExerciseTemplateResponse>),
        (status = 304, description = "Not modified"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_exercises(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<ExerciseQuery>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, AppError> {
    let exercises = ExerciseRepository::find_all(&pool, auth_user.user_id, &query).await?;

    let response_vec: Vec<ExerciseTemplateResponse> = exercises
        .into_iter()
        .map(|e| ExerciseTemplateResponse {
            id: e.id,
            name: e.name,
            muscle_groups: e.muscle_groups,
            category: e.category,
            equipment: e.equipment,
            is_custom: e.is_custom,
            description: e.description,
            instructions: e.instructions,
        })
        .collect();

    let body = serde_json::to_vec(&response_vec).unwrap();
    let etag = compute_etag(&body);

    if check_none_match(&headers, &etag) {
        return Ok(StatusCode::NOT_MODIFIED.into_response());
    }

    Ok(([(header::ETAG, etag)], Json(response_vec)).into_response())
}

#[utoipa::path(
    get,
    path = "/api/v1/exercises/{id}",
    tag = "Exercises",
    params(("id" = String, Path, description = "Exercise template ID")),
    responses(
        (status = 200, description = "Exercise details", body = ExerciseTemplateResponse),
        (status = 404, description = "Exercise not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_exercise(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<String>,
) -> Result<Json<ExerciseTemplateResponse>, AppError> {
    let exercise = ExerciseRepository::find_by_id(&pool, &id, auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Exercise not found".to_string()))?;

    Ok(Json(ExerciseTemplateResponse {
        id: exercise.id,
        name: exercise.name,
        muscle_groups: exercise.muscle_groups,
        category: exercise.category,
        equipment: exercise.equipment,
        is_custom: exercise.is_custom,
        description: exercise.description,
        instructions: exercise.instructions,
    }))
}

#[utoipa::path(
    post,
    path = "/api/v1/exercises/custom",
    tag = "Exercises",
    request_body = CreateExerciseRequest,
    responses(
        (status = 200, description = "Custom exercise created", body = ExerciseTemplateResponse),
        (status = 400, description = "Validation error", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn create_custom_exercise(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Json(req): Json<CreateExerciseRequest>,
) -> Result<Json<ExerciseTemplateResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    // Generate a custom ID
    let id = format!(
        "custom-{}-{}",
        auth_user.user_id,
        Uuid::new_v4().to_string().split('-').next().unwrap()
    );

    let exercise = ExerciseRepository::create(
        &pool,
        auth_user.user_id,
        &id,
        &req.name,
        &req.muscle_groups,
        &req.category,
        &req.equipment,
        req.description.as_deref(),
        req.instructions.as_deref(),
    )
    .await?;

    Ok(Json(ExerciseTemplateResponse {
        id: exercise.id,
        name: exercise.name,
        muscle_groups: exercise.muscle_groups,
        category: exercise.category,
        equipment: exercise.equipment,
        is_custom: exercise.is_custom,
        description: exercise.description,
        instructions: exercise.instructions,
    }))
}

#[utoipa::path(
    put,
    path = "/api/v1/exercises/custom/{id}",
    tag = "Exercises",
    params(("id" = String, Path, description = "Custom exercise template ID")),
    request_body = UpdateExerciseRequest,
    responses(
        (status = 200, description = "Custom exercise updated", body = ExerciseTemplateResponse),
        (status = 404, description = "Exercise not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn update_custom_exercise(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<String>,
    Json(req): Json<UpdateExerciseRequest>,
) -> Result<Json<ExerciseTemplateResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let exercise = ExerciseRepository::update(
        &pool,
        &id,
        auth_user.user_id,
        req.name.as_deref(),
        req.muscle_groups.as_deref(),
        req.category.as_ref(),
        req.equipment.as_deref(),
        req.description.as_deref(),
        req.instructions.as_deref(),
    )
    .await?;

    Ok(Json(ExerciseTemplateResponse {
        id: exercise.id,
        name: exercise.name,
        muscle_groups: exercise.muscle_groups,
        category: exercise.category,
        equipment: exercise.equipment,
        is_custom: exercise.is_custom,
        description: exercise.description,
        instructions: exercise.instructions,
    }))
}

#[utoipa::path(
    delete,
    path = "/api/v1/exercises/custom/{id}",
    tag = "Exercises",
    params(("id" = String, Path, description = "Custom exercise template ID")),
    responses(
        (status = 200, description = "Custom exercise deleted"),
        (status = 404, description = "Exercise not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn delete_custom_exercise(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<String>,
) -> Result<(), AppError> {
    ExerciseRepository::delete(&pool, &id, auth_user.user_id).await
}
