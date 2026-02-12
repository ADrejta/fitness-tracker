use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

use crate::dto::{
    CreateExerciseRequest, ExerciseQuery, ExerciseTemplateResponse, UpdateExerciseRequest,
};
use crate::error::AppError;
use crate::middleware::AuthUser;
use crate::repositories::ExerciseRepository;

pub async fn list_exercises(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<ExerciseQuery>,
) -> Result<Json<Vec<ExerciseTemplateResponse>>, AppError> {
    let exercises = ExerciseRepository::find_all(&pool, auth_user.user_id, &query).await?;

    Ok(Json(
        exercises
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
            .collect(),
    ))
}

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

pub async fn update_custom_exercise(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<String>,
    Json(req): Json<UpdateExerciseRequest>,
) -> Result<Json<ExerciseTemplateResponse>, AppError> {
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

pub async fn delete_custom_exercise(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<String>,
) -> Result<(), AppError> {
    ExerciseRepository::delete(&pool, &id, auth_user.user_id).await
}
