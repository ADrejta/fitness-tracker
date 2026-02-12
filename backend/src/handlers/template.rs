use axum::{
    extract::{Path, State},
    Extension, Json,
};
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

use crate::dto::{
    CreateTemplateRequest, TemplateExerciseResponse, TemplateListResponse, TemplateSetResponse,
    TemplateSummaryResponse, UpdateTemplateRequest, WorkoutResponse, WorkoutTemplateResponse,
};
use crate::error::AppError;
use crate::middleware::AuthUser;
use crate::repositories::TemplateRepository;
use crate::services::WorkoutService;

pub async fn list_templates(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<TemplateListResponse>, AppError> {
    let templates = TemplateRepository::find_all(&pool, auth_user.user_id).await?;
    let total = templates.len() as i64;

    Ok(Json(TemplateListResponse {
        templates: templates
            .into_iter()
            .map(|t| TemplateSummaryResponse {
                id: t.id,
                name: t.name,
                description: t.description,
                exercise_count: t.exercise_count,
                estimated_duration: t.estimated_duration,
                created_at: t.created_at,
                last_used_at: t.last_used_at,
                usage_count: t.usage_count,
                tags: t.tags,
            })
            .collect(),
        total,
    }))
}

pub async fn get_template(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<WorkoutTemplateResponse>, AppError> {
    let template = TemplateRepository::find_by_id(&pool, id, auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Template not found".to_string()))?;

    let exercises = TemplateRepository::get_exercises_with_sets(&pool, id).await?;

    Ok(Json(WorkoutTemplateResponse {
        id: template.id,
        name: template.name,
        description: template.description,
        exercises: exercises
            .into_iter()
            .map(|e| TemplateExerciseResponse {
                id: e.id,
                exercise_template_id: e.exercise_template_id,
                exercise_name: e.exercise_name,
                sets: e
                    .sets
                    .into_iter()
                    .map(|s| TemplateSetResponse {
                        set_number: s.set_number,
                        target_reps: s.target_reps,
                        target_weight: s.target_weight,
                        is_warmup: s.is_warmup,
                    })
                    .collect(),
                notes: e.notes,
                rest_seconds: e.rest_seconds,
                superset_id: e.superset_id,
            })
            .collect(),
        estimated_duration: template.estimated_duration,
        created_at: template.created_at,
        last_used_at: template.last_used_at,
        usage_count: template.usage_count,
        tags: template.tags,
    }))
}

pub async fn create_template(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Json(req): Json<CreateTemplateRequest>,
) -> Result<Json<WorkoutTemplateResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let template = TemplateRepository::create(
        &pool,
        auth_user.user_id,
        &req.name,
        req.description.as_deref(),
        &req.exercises,
        req.estimated_duration,
        req.tags.as_deref(),
    )
    .await?;

    let exercises = TemplateRepository::get_exercises_with_sets(&pool, template.id).await?;

    Ok(Json(WorkoutTemplateResponse {
        id: template.id,
        name: template.name,
        description: template.description,
        exercises: exercises
            .into_iter()
            .map(|e| TemplateExerciseResponse {
                id: e.id,
                exercise_template_id: e.exercise_template_id,
                exercise_name: e.exercise_name,
                sets: e
                    .sets
                    .into_iter()
                    .map(|s| TemplateSetResponse {
                        set_number: s.set_number,
                        target_reps: s.target_reps,
                        target_weight: s.target_weight,
                        is_warmup: s.is_warmup,
                    })
                    .collect(),
                notes: e.notes,
                rest_seconds: e.rest_seconds,
                superset_id: e.superset_id,
            })
            .collect(),
        estimated_duration: template.estimated_duration,
        created_at: template.created_at,
        last_used_at: template.last_used_at,
        usage_count: template.usage_count,
        tags: template.tags,
    }))
}

pub async fn update_template(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTemplateRequest>,
) -> Result<Json<WorkoutTemplateResponse>, AppError> {
    let template = TemplateRepository::update(
        &pool,
        id,
        auth_user.user_id,
        req.name.as_deref(),
        req.description.as_deref(),
        req.exercises.as_deref(),
        req.estimated_duration,
        req.tags.as_deref(),
    )
    .await?;

    let exercises = TemplateRepository::get_exercises_with_sets(&pool, template.id).await?;

    Ok(Json(WorkoutTemplateResponse {
        id: template.id,
        name: template.name,
        description: template.description,
        exercises: exercises
            .into_iter()
            .map(|e| TemplateExerciseResponse {
                id: e.id,
                exercise_template_id: e.exercise_template_id,
                exercise_name: e.exercise_name,
                sets: e
                    .sets
                    .into_iter()
                    .map(|s| TemplateSetResponse {
                        set_number: s.set_number,
                        target_reps: s.target_reps,
                        target_weight: s.target_weight,
                        is_warmup: s.is_warmup,
                    })
                    .collect(),
                notes: e.notes,
                rest_seconds: e.rest_seconds,
                superset_id: e.superset_id,
            })
            .collect(),
        estimated_duration: template.estimated_duration,
        created_at: template.created_at,
        last_used_at: template.last_used_at,
        usage_count: template.usage_count,
        tags: template.tags,
    }))
}

pub async fn delete_template(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<(), AppError> {
    TemplateRepository::delete(&pool, id, auth_user.user_id).await
}

pub async fn start_workout_from_template(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<WorkoutResponse>, AppError> {
    let response = WorkoutService::start_from_template(&pool, auth_user.user_id, id).await?;
    Ok(Json(response))
}
