use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

use crate::dto::{
    CreateSetRequest, CreateSupersetRequest, CreateWorkoutExerciseRequest, CreateWorkoutRequest,
    ErrorResponse, ReorderExercisesRequest, SupersetResponse, UpdateSetRequest,
    UpdateWorkoutExerciseRequest, UpdateWorkoutRequest, WorkoutExerciseResponse, WorkoutListResponse,
    WorkoutQuery, WorkoutResponse, WorkoutSetResponse, WorkoutSummaryResponse,
};
use crate::cache;
use crate::error::AppError;
use crate::middleware::AuthUser;
use crate::repositories::WorkoutRepository;
use crate::services::WorkoutService;

// Workout handlers

#[utoipa::path(
    post,
    path = "/api/v1/workouts",
    tag = "Workouts",
    request_body = CreateWorkoutRequest,
    responses(
        (status = 200, description = "Workout created", body = WorkoutResponse),
        (status = 400, description = "Validation error", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
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

#[utoipa::path(
    get,
    path = "/api/v1/workouts",
    tag = "Workouts",
    params(WorkoutQuery),
    responses(
        (status = 200, description = "List of workouts", body = WorkoutListResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_workouts(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<WorkoutQuery>,
) -> Result<Json<WorkoutListResponse>, AppError> {
    query
        .validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

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
                tags: w.tags,
            })
            .collect(),
        total,
    }))
}

#[utoipa::path(
    get,
    path = "/api/v1/workouts/{id}",
    tag = "Workouts",
    params(("id" = Uuid, Path, description = "Workout ID")),
    responses(
        (status = 200, description = "Workout details", body = WorkoutResponse),
        (status = 404, description = "Workout not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_workout(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<WorkoutResponse>, AppError> {
    let response = WorkoutService::get_workout_with_exercises(&pool, id, auth_user.user_id).await?;
    Ok(Json(response))
}

#[utoipa::path(
    patch,
    path = "/api/v1/workouts/{id}",
    tag = "Workouts",
    params(("id" = Uuid, Path, description = "Workout ID")),
    request_body = UpdateWorkoutRequest,
    responses(
        (status = 200, description = "Workout updated", body = WorkoutResponse),
        (status = 404, description = "Workout not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn update_workout(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateWorkoutRequest>,
) -> Result<Json<WorkoutResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    WorkoutRepository::update(
        &pool,
        id,
        auth_user.user_id,
        req.name.as_deref(),
        req.notes.as_deref(),
        req.tags.as_deref(),
    )
    .await?;

    let response = WorkoutService::get_workout_with_exercises(&pool, id, auth_user.user_id).await?;
    Ok(Json(response))
}

#[utoipa::path(
    delete,
    path = "/api/v1/workouts/{id}",
    tag = "Workouts",
    params(("id" = Uuid, Path, description = "Workout ID")),
    responses(
        (status = 200, description = "Workout deleted"),
        (status = 404, description = "Workout not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn delete_workout(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<(), AppError> {
    WorkoutRepository::delete(&pool, id, auth_user.user_id).await
}

#[utoipa::path(
    post,
    path = "/api/v1/workouts/{id}/restore",
    tag = "Workouts",
    params(("id" = Uuid, Path, description = "Workout ID")),
    responses(
        (status = 200, description = "Workout restored", body = WorkoutResponse),
        (status = 404, description = "Workout not found or not deleted", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn restore_workout(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<WorkoutResponse>, AppError> {
    WorkoutRepository::restore(&pool, id, auth_user.user_id).await?;
    let response = WorkoutService::get_workout_with_exercises(&pool, id, auth_user.user_id).await?;
    Ok(Json(response))
}

#[utoipa::path(
    post,
    path = "/api/v1/workouts/{id}/complete",
    tag = "Workouts",
    params(("id" = Uuid, Path, description = "Workout ID")),
    responses(
        (status = 200, description = "Workout completed", body = WorkoutResponse),
        (status = 404, description = "Workout not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn complete_workout(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<WorkoutResponse>, AppError> {
    let response = WorkoutService::complete_workout(&pool, id, auth_user.user_id).await?;
    Ok(Json(response))
}

#[utoipa::path(
    post,
    path = "/api/v1/workouts/{id}/cancel",
    tag = "Workouts",
    params(("id" = Uuid, Path, description = "Workout ID")),
    responses(
        (status = 200, description = "Workout cancelled", body = WorkoutResponse),
        (status = 404, description = "Workout not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
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

#[utoipa::path(
    post,
    path = "/api/v1/workouts/{workout_id}/exercises",
    tag = "Workout Exercises",
    params(("workout_id" = Uuid, Path, description = "Workout ID")),
    request_body = CreateWorkoutExerciseRequest,
    responses(
        (status = 200, description = "Exercise added to workout", body = WorkoutExerciseResponse),
        (status = 400, description = "Validation error", body = ErrorResponse),
        (status = 404, description = "Workout not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
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

    // Resolve exercise name: use provided value, fall back to cache, then DB
    let exercise_name = if let Some(ref name) = req.exercise_name {
        name.clone()
    } else if let Some(cached) = cache::get_exercise_name(&req.exercise_template_id) {
        cached
    } else {
        sqlx::query_scalar::<_, String>(
            "SELECT name FROM exercise_templates WHERE id = $1",
        )
        .bind(&req.exercise_template_id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Exercise template not found".to_string()))?
    };

    let exercise = WorkoutRepository::add_exercise(
        &pool,
        workout_id,
        &req.exercise_template_id,
        &exercise_name,
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
                rpe: s.rpe,
            })
            .collect(),
        notes: exercise.notes,
        superset_id: exercise.superset_id,
    }))
}

#[utoipa::path(
    patch,
    path = "/api/v1/workouts/{workout_id}/exercises/{exercise_id}",
    tag = "Workout Exercises",
    params(
        ("workout_id" = Uuid, Path, description = "Workout ID"),
        ("exercise_id" = Uuid, Path, description = "Exercise ID"),
    ),
    request_body = UpdateWorkoutExerciseRequest,
    responses(
        (status = 200, description = "Exercise updated", body = WorkoutExerciseResponse),
        (status = 404, description = "Exercise not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn update_exercise(
    State(pool): State<PgPool>,
    Path((_workout_id, exercise_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateWorkoutExerciseRequest>,
) -> Result<Json<WorkoutExerciseResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

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
                rpe: s.rpe,
            })
            .collect(),
        notes: exercise.notes,
        superset_id: exercise.superset_id,
    }))
}

#[utoipa::path(
    delete,
    path = "/api/v1/workouts/{workout_id}/exercises/{exercise_id}",
    tag = "Workout Exercises",
    params(
        ("workout_id" = Uuid, Path, description = "Workout ID"),
        ("exercise_id" = Uuid, Path, description = "Exercise ID"),
    ),
    responses(
        (status = 200, description = "Exercise removed from workout"),
        (status = 404, description = "Exercise not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn delete_exercise(
    State(pool): State<PgPool>,
    Path((_workout_id, exercise_id)): Path<(Uuid, Uuid)>,
) -> Result<(), AppError> {
    WorkoutRepository::delete_exercise(&pool, exercise_id).await
}

// Set handlers

#[utoipa::path(
    post,
    path = "/api/v1/workouts/{workout_id}/exercises/{exercise_id}/sets",
    tag = "Workout Sets",
    params(
        ("workout_id" = Uuid, Path, description = "Workout ID"),
        ("exercise_id" = Uuid, Path, description = "Exercise ID"),
    ),
    request_body = CreateSetRequest,
    responses(
        (status = 200, description = "Set added", body = WorkoutSetResponse),
        (status = 404, description = "Exercise not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn add_set(
    State(pool): State<PgPool>,
    Path((_workout_id, exercise_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<CreateSetRequest>,
) -> Result<Json<WorkoutSetResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

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
        rpe: set.rpe,
    }))
}

#[utoipa::path(
    patch,
    path = "/api/v1/workouts/{workout_id}/exercises/{exercise_id}/sets/{set_id}",
    tag = "Workout Sets",
    params(
        ("workout_id" = Uuid, Path, description = "Workout ID"),
        ("exercise_id" = Uuid, Path, description = "Exercise ID"),
        ("set_id" = Uuid, Path, description = "Set ID"),
    ),
    request_body = UpdateSetRequest,
    responses(
        (status = 200, description = "Set updated", body = WorkoutSetResponse),
        (status = 404, description = "Set not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn update_set(
    State(pool): State<PgPool>,
    Path((_workout_id, _exercise_id, set_id)): Path<(Uuid, Uuid, Uuid)>,
    Json(req): Json<UpdateSetRequest>,
) -> Result<Json<WorkoutSetResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let set = WorkoutRepository::update_set(
        &pool,
        set_id,
        req.target_reps,
        req.actual_reps,
        req.target_weight,
        req.actual_weight,
        req.is_warmup,
        req.is_completed,
        req.rpe,
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
        rpe: set.rpe,
    }))
}

#[utoipa::path(
    delete,
    path = "/api/v1/workouts/{workout_id}/exercises/{exercise_id}/sets/{set_id}",
    tag = "Workout Sets",
    params(
        ("workout_id" = Uuid, Path, description = "Workout ID"),
        ("exercise_id" = Uuid, Path, description = "Exercise ID"),
        ("set_id" = Uuid, Path, description = "Set ID"),
    ),
    responses(
        (status = 200, description = "Set deleted"),
        (status = 404, description = "Set not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn delete_set(
    State(pool): State<PgPool>,
    Path((_workout_id, _exercise_id, set_id)): Path<(Uuid, Uuid, Uuid)>,
) -> Result<(), AppError> {
    WorkoutRepository::delete_set(&pool, set_id).await
}

// Superset handlers

#[utoipa::path(
    post,
    path = "/api/v1/workouts/{workout_id}/superset",
    tag = "Workout Supersets",
    params(("workout_id" = Uuid, Path, description = "Workout ID")),
    request_body = CreateSupersetRequest,
    responses(
        (status = 200, description = "Superset created", body = SupersetResponse),
        (status = 400, description = "Validation error", body = ErrorResponse),
        (status = 404, description = "Workout not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
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

#[utoipa::path(
    delete,
    path = "/api/v1/workouts/{workout_id}/superset/{superset_id}",
    tag = "Workout Supersets",
    params(
        ("workout_id" = Uuid, Path, description = "Workout ID"),
        ("superset_id" = Uuid, Path, description = "Superset ID"),
    ),
    responses(
        (status = 200, description = "Superset removed"),
        (status = 404, description = "Workout not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
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

#[utoipa::path(
    patch,
    path = "/api/v1/workouts/{workout_id}/exercises/reorder",
    tag = "Workout Exercises",
    params(("workout_id" = Uuid, Path, description = "Workout ID")),
    request_body = ReorderExercisesRequest,
    responses(
        (status = 200, description = "Exercises reordered"),
        (status = 400, description = "Validation error", body = ErrorResponse),
        (status = 404, description = "Workout not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn reorder_exercises(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(workout_id): Path<Uuid>,
    Json(req): Json<ReorderExercisesRequest>,
) -> Result<(), AppError> {
    // Verify workout belongs to user
    WorkoutRepository::find_by_id(&pool, workout_id, auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Workout not found".to_string()))?;

    WorkoutRepository::reorder_exercises(&pool, workout_id, &req.exercises).await
}
