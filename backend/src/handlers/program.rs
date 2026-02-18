use axum::{
    extract::{Path, State},
    Extension, Json,
};
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

use crate::dto::{
    CreateProgramRequest, ErrorResponse, ProgramListResponse, ProgramResponse,
    ProgramSummaryResponse, ProgramWeekResponse, ProgramWorkoutResponse, UpdateProgramRequest,
    WorkoutResponse,
};
use crate::error::AppError;
use crate::middleware::AuthUser;
use crate::repositories::ProgramRepository;
use crate::services::WorkoutService;

#[utoipa::path(
    post,
    path = "/api/v1/programs",
    tag = "Programs",
    request_body = CreateProgramRequest,
    responses(
        (status = 200, description = "Program created", body = ProgramResponse),
        (status = 400, description = "Validation error", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn create_program(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Json(req): Json<CreateProgramRequest>,
) -> Result<Json<ProgramResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let program = ProgramRepository::create(
        &pool,
        auth_user.user_id,
        &req.name,
        req.description.as_deref(),
        req.duration_weeks,
    )
    .await?;

    // Add all workouts
    for workout_req in &req.workouts {
        ProgramRepository::add_workout(
            &pool,
            program.id,
            workout_req.week_number,
            workout_req.day_number,
            &workout_req.name,
            workout_req.template_id,
            workout_req.is_rest_day,
            workout_req.notes.as_deref(),
        )
        .await?;
    }

    let workouts = ProgramRepository::find_workouts(&pool, program.id).await?;

    Ok(Json(build_program_response(program, workouts)))
}

#[utoipa::path(
    get,
    path = "/api/v1/programs",
    tag = "Programs",
    responses(
        (status = 200, description = "List of programs", body = ProgramListResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_programs(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<ProgramListResponse>, AppError> {
    let programs = ProgramRepository::find_all(&pool, auth_user.user_id).await?;

    // Batch-fetch all workouts for all programs in a single query
    let program_ids: Vec<uuid::Uuid> = programs.iter().map(|p| p.id).collect();
    let workouts_by_program = ProgramRepository::find_workouts_batch(&pool, &program_ids).await?;

    let summaries = programs
        .into_iter()
        .map(|program| {
            let workouts = workouts_by_program.get(&program.id);
            let total_workouts = workouts
                .map(|ws| ws.iter().filter(|w| !w.is_rest_day).count() as i32)
                .unwrap_or(0);
            let completed_workouts = workouts
                .map(|ws| {
                    ws.iter()
                        .filter(|w| !w.is_rest_day && w.completed_workout_id.is_some())
                        .count() as i32
                })
                .unwrap_or(0);

            ProgramSummaryResponse {
                id: program.id,
                name: program.name,
                description: program.description,
                duration_weeks: program.duration_weeks,
                is_active: program.is_active,
                current_week: program.current_week,
                current_day: program.current_day,
                started_at: program.started_at,
                completed_at: program.completed_at,
                created_at: program.created_at,
                total_workouts,
                completed_workouts,
            }
        })
        .collect();

    Ok(Json(ProgramListResponse {
        programs: summaries,
    }))
}

#[utoipa::path(
    get,
    path = "/api/v1/programs/{id}",
    tag = "Programs",
    params(("id" = Uuid, Path, description = "Program ID")),
    responses(
        (status = 200, description = "Program details", body = ProgramResponse),
        (status = 404, description = "Program not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_program(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<ProgramResponse>, AppError> {
    let program = ProgramRepository::find_by_id(&pool, id, auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Program not found".to_string()))?;

    let workouts = ProgramRepository::find_workouts(&pool, program.id).await?;

    Ok(Json(build_program_response(program, workouts)))
}

#[utoipa::path(
    patch,
    path = "/api/v1/programs/{id}",
    tag = "Programs",
    params(("id" = Uuid, Path, description = "Program ID")),
    request_body = UpdateProgramRequest,
    responses(
        (status = 200, description = "Program updated", body = ProgramResponse),
        (status = 404, description = "Program not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn update_program(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProgramRequest>,
) -> Result<Json<ProgramResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let program = ProgramRepository::update(
        &pool,
        id,
        auth_user.user_id,
        req.name.as_deref(),
        req.description.as_deref(),
        req.duration_weeks,
    )
    .await?;

    // If workouts are provided, replace them all
    if let Some(workout_reqs) = &req.workouts {
        ProgramRepository::delete_workouts_by_program(&pool, program.id).await?;
        for workout_req in workout_reqs {
            ProgramRepository::add_workout(
                &pool,
                program.id,
                workout_req.week_number,
                workout_req.day_number,
                &workout_req.name,
                workout_req.template_id,
                workout_req.is_rest_day,
                workout_req.notes.as_deref(),
            )
            .await?;
        }
    }

    let workouts = ProgramRepository::find_workouts(&pool, program.id).await?;

    Ok(Json(build_program_response(program, workouts)))
}

#[utoipa::path(
    delete,
    path = "/api/v1/programs/{id}",
    tag = "Programs",
    params(("id" = Uuid, Path, description = "Program ID")),
    responses(
        (status = 200, description = "Program deleted"),
        (status = 404, description = "Program not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn delete_program(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<(), AppError> {
    ProgramRepository::delete(&pool, id, auth_user.user_id).await
}

#[utoipa::path(
    post,
    path = "/api/v1/programs/{id}/start",
    tag = "Programs",
    params(("id" = Uuid, Path, description = "Program ID")),
    responses(
        (status = 200, description = "Program activated", body = ProgramResponse),
        (status = 404, description = "Program not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn start_program(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<ProgramResponse>, AppError> {
    let program = ProgramRepository::activate(&pool, id, auth_user.user_id).await?;
    let workouts = ProgramRepository::find_workouts(&pool, program.id).await?;

    Ok(Json(build_program_response(program, workouts)))
}

#[utoipa::path(
    post,
    path = "/api/v1/programs/{program_id}/workouts/{workout_id}/start",
    tag = "Program Workouts",
    params(
        ("program_id" = Uuid, Path, description = "Program ID"),
        ("workout_id" = Uuid, Path, description = "Program workout slot ID"),
    ),
    responses(
        (status = 200, description = "Workout started from program slot", body = WorkoutResponse),
        (status = 404, description = "Program or workout not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn start_program_workout(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path((program_id, workout_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<WorkoutResponse>, AppError> {
    // Verify program belongs to user
    let _program = ProgramRepository::find_by_id(&pool, program_id, auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Program not found".to_string()))?;

    // Get the program workout slot
    let program_workout =
        ProgramRepository::find_workout_by_id(&pool, workout_id, program_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Program workout not found".to_string()))?;

    if program_workout.is_rest_day {
        return Err(AppError::Validation("Cannot start a rest day".to_string()));
    }

    // Start workout from template if one is linked
    let response = if let Some(template_id) = program_workout.template_id {
        WorkoutService::start_from_template(&pool, auth_user.user_id, template_id).await?
    } else {
        // Start an empty workout with the program workout name
        WorkoutService::start_empty(&pool, auth_user.user_id, &program_workout.name).await?
    };

    // Link the completed workout to the program slot
    ProgramRepository::mark_workout_completed(&pool, workout_id, response.id).await?;

    Ok(Json(response))
}

#[utoipa::path(
    get,
    path = "/api/v1/programs/active",
    tag = "Programs",
    responses(
        (status = 200, description = "Active program", body = ProgramResponse),
        (status = 404, description = "No active program", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_active_program(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<ProgramResponse>, AppError> {
    let program = ProgramRepository::find_active(&pool, auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("No active program".to_string()))?;

    let workouts = ProgramRepository::find_workouts(&pool, program.id).await?;

    Ok(Json(build_program_response(program, workouts)))
}

fn build_program_response(
    program: crate::models::WorkoutProgram,
    workouts: Vec<crate::models::ProgramWorkout>,
) -> ProgramResponse {
    // Group workouts by week
    let mut weeks: std::collections::BTreeMap<i32, Vec<ProgramWorkoutResponse>> =
        std::collections::BTreeMap::new();

    for w in workouts {
        weeks
            .entry(w.week_number)
            .or_default()
            .push(ProgramWorkoutResponse {
                id: w.id,
                week_number: w.week_number,
                day_number: w.day_number,
                name: w.name,
                template_id: w.template_id,
                is_rest_day: w.is_rest_day,
                notes: w.notes,
                completed_workout_id: w.completed_workout_id,
                completed_at: w.completed_at,
            });
    }

    ProgramResponse {
        id: program.id,
        name: program.name,
        description: program.description,
        duration_weeks: program.duration_weeks,
        is_active: program.is_active,
        current_week: program.current_week,
        current_day: program.current_day,
        started_at: program.started_at,
        completed_at: program.completed_at,
        created_at: program.created_at,
        weeks: weeks
            .into_iter()
            .map(|(week_number, workouts)| ProgramWeekResponse {
                week_number,
                workouts,
            })
            .collect(),
    }
}
