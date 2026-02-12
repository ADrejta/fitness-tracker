use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

use crate::dto::{
    CreateSetRequest, CreateSupersetRequest, CreateWorkoutExerciseRequest, CreateWorkoutRequest,
    SupersetResponse, UpdateSetRequest, UpdateWorkoutExerciseRequest, UpdateWorkoutRequest,
    WorkoutExerciseResponse, WorkoutListResponse, WorkoutQuery, WorkoutResponse,
    WorkoutSetResponse, WorkoutSummaryResponse,
};
use crate::error::AppError;
use crate::middleware::AuthUser;
use crate::repositories::WorkoutRepository;
use crate::services::WorkoutService;

// Workout handlers
pub async fn create_workout(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Json(req): Json<CreateWorkoutRequest>,
) -> Result<Json<WorkoutResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let workout = WorkoutRepository::create(
        &pool,
        auth_user.user_id,
        &req.name,
        req.template_id,
        req.notes.as_deref(),
    )
    .await?;

    let response = WorkoutService::get_workout_with_exercises(&pool, workout.id, auth_user.user_id).await?;
    Ok(Json(response))
}

pub async fn list_workouts(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<WorkoutQuery>,
) -> Result<Json<WorkoutListResponse>, AppError> {
    let (workouts, total) = WorkoutRepository::find_all(&pool, auth_user.user_id, &query).await?;

    Ok(Json(WorkoutListResponse {
        workouts: workouts
            .into_iter()
            .map(|w| WorkoutSummaryResponse {
                id: w.id,
                name: w.name,
                started_at: w.started_at,
                completed_at: w.completed_at,
                total_volume: w.total_volume,
                total_sets: w.total_sets,
                total_reps: w.total_reps,
                duration: w.duration,
                status: w.status,
                exercise_count: w.exercise_count,
            })
            .collect(),
        total,
    }))
}

pub async fn get_workout(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<WorkoutResponse>, AppError> {
    let response = WorkoutService::get_workout_with_exercises(&pool, id, auth_user.user_id).await?;
    Ok(Json(response))
}

pub async fn update_workout(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateWorkoutRequest>,
) -> Result<Json<WorkoutResponse>, AppError> {
    WorkoutRepository::update(
        &pool,
        id,
        auth_user.user_id,
        req.name.as_deref(),
        req.notes.as_deref(),
    )
    .await?;

    let response = WorkoutService::get_workout_with_exercises(&pool, id, auth_user.user_id).await?;
    Ok(Json(response))
}

pub async fn delete_workout(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<(), AppError> {
    WorkoutRepository::delete(&pool, id, auth_user.user_id).await
}

pub async fn complete_workout(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<WorkoutResponse>, AppError> {
    let response = WorkoutService::complete_workout(&pool, id, auth_user.user_id).await?;
    Ok(Json(response))
}

pub async fn cancel_workout(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<WorkoutResponse>, AppError> {
    WorkoutRepository::cancel(&pool, id, auth_user.user_id).await?;
    let response = WorkoutService::get_workout_with_exercises(&pool, id, auth_user.user_id).await?;
    Ok(Json(response))
}

// Exercise handlers
pub async fn add_exercise(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(workout_id): Path<Uuid>,
    Json(req): Json<CreateWorkoutExerciseRequest>,
) -> Result<Json<WorkoutExerciseResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    // Verify workout belongs to user
    WorkoutRepository::find_by_id(&pool, workout_id, auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Workout not found".to_string()))?;

    let exercise = WorkoutRepository::add_exercise(
        &pool,
        workout_id,
        &req.exercise_template_id,
        &req.exercise_name,
        req.notes.as_deref(),
        req.superset_id,
    )
    .await?;

    let sets = WorkoutRepository::get_sets(&pool, exercise.id).await?;

    Ok(Json(WorkoutExerciseResponse {
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
    }))
}

pub async fn update_exercise(
    State(pool): State<PgPool>,
    Path((_workout_id, exercise_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateWorkoutExerciseRequest>,
) -> Result<Json<WorkoutExerciseResponse>, AppError> {
    let exercise = WorkoutRepository::update_exercise(&pool, exercise_id, req.notes.as_deref()).await?;
    let sets = WorkoutRepository::get_sets(&pool, exercise_id).await?;

    Ok(Json(WorkoutExerciseResponse {
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
    }))
}

pub async fn delete_exercise(
    State(pool): State<PgPool>,
    Path((_workout_id, exercise_id)): Path<(Uuid, Uuid)>,
) -> Result<(), AppError> {
    WorkoutRepository::delete_exercise(&pool, exercise_id).await
}

// Set handlers
pub async fn add_set(
    State(pool): State<PgPool>,
    Path((_workout_id, exercise_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<CreateSetRequest>,
) -> Result<Json<WorkoutSetResponse>, AppError> {
    let set = WorkoutRepository::add_set(
        &pool,
        exercise_id,
        req.target_reps,
        req.target_weight,
        req.is_warmup,
    )
    .await?;

    Ok(Json(WorkoutSetResponse {
        id: set.id,
        set_number: set.set_number,
        target_reps: set.target_reps,
        actual_reps: set.actual_reps,
        target_weight: set.target_weight,
        actual_weight: set.actual_weight,
        is_warmup: set.is_warmup,
        is_completed: set.is_completed,
        completed_at: set.completed_at,
    }))
}

pub async fn update_set(
    State(pool): State<PgPool>,
    Path((_workout_id, _exercise_id, set_id)): Path<(Uuid, Uuid, Uuid)>,
    Json(req): Json<UpdateSetRequest>,
) -> Result<Json<WorkoutSetResponse>, AppError> {
    let set = WorkoutRepository::update_set(
        &pool,
        set_id,
        req.target_reps,
        req.actual_reps,
        req.target_weight,
        req.actual_weight,
        req.is_warmup,
        req.is_completed,
    )
    .await?;

    Ok(Json(WorkoutSetResponse {
        id: set.id,
        set_number: set.set_number,
        target_reps: set.target_reps,
        actual_reps: set.actual_reps,
        target_weight: set.target_weight,
        actual_weight: set.actual_weight,
        is_warmup: set.is_warmup,
        is_completed: set.is_completed,
        completed_at: set.completed_at,
    }))
}

pub async fn delete_set(
    State(pool): State<PgPool>,
    Path((_workout_id, _exercise_id, set_id)): Path<(Uuid, Uuid, Uuid)>,
) -> Result<(), AppError> {
    WorkoutRepository::delete_set(&pool, set_id).await
}

// Superset handlers
pub async fn create_superset(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(workout_id): Path<Uuid>,
    Json(req): Json<CreateSupersetRequest>,
) -> Result<Json<SupersetResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    // Verify workout belongs to user
    WorkoutRepository::find_by_id(&pool, workout_id, auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Workout not found".to_string()))?;

    let superset_id = WorkoutRepository::create_superset(&pool, workout_id, &req.exercise_ids).await?;

    Ok(Json(SupersetResponse {
        superset_id,
        exercise_ids: req.exercise_ids,
    }))
}

pub async fn remove_superset(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path((workout_id, superset_id)): Path<(Uuid, Uuid)>,
) -> Result<(), AppError> {
    // Verify workout belongs to user
    WorkoutRepository::find_by_id(&pool, workout_id, auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Workout not found".to_string()))?;

    WorkoutRepository::remove_superset(&pool, workout_id, superset_id).await
}
