use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{ProgramWorkout, WorkoutProgram};

pub struct ProgramRepository;

impl ProgramRepository {
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        name: &str,
        description: Option<&str>,
        duration_weeks: i32,
    ) -> Result<WorkoutProgram, AppError> {
        let program = sqlx::query_as::<_, WorkoutProgram>(
            r#"
            INSERT INTO workout_programs (id, user_id, name, description, duration_weeks)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(user_id)
        .bind(name)
        .bind(description)
        .bind(duration_weeks)
        .fetch_one(pool)
        .await?;

        Ok(program)
    }

    pub async fn find_by_id(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<WorkoutProgram>, AppError> {
        let program = sqlx::query_as::<_, WorkoutProgram>(
            "SELECT * FROM workout_programs WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

        Ok(program)
    }

    pub async fn find_all(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<WorkoutProgram>, AppError> {
        let programs = sqlx::query_as::<_, WorkoutProgram>(
            "SELECT * FROM workout_programs WHERE user_id = $1 ORDER BY created_at DESC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        Ok(programs)
    }

    pub async fn find_active(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Option<WorkoutProgram>, AppError> {
        let program = sqlx::query_as::<_, WorkoutProgram>(
            "SELECT * FROM workout_programs WHERE user_id = $1 AND is_active = true",
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

        Ok(program)
    }

    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
        name: Option<&str>,
        description: Option<&str>,
        duration_weeks: Option<i32>,
    ) -> Result<WorkoutProgram, AppError> {
        let program = sqlx::query_as::<_, WorkoutProgram>(
            r#"
            UPDATE workout_programs SET
                name = COALESCE($3, name),
                description = COALESCE($4, description),
                duration_weeks = COALESCE($5, duration_weeks)
            WHERE id = $1 AND user_id = $2
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(user_id)
        .bind(name)
        .bind(description)
        .bind(duration_weeks)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Program not found".to_string()))?;

        Ok(program)
    }

    pub async fn delete(pool: &PgPool, id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        let result =
            sqlx::query("DELETE FROM workout_programs WHERE id = $1 AND user_id = $2")
                .bind(id)
                .bind(user_id)
                .execute(pool)
                .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Program not found".to_string()));
        }

        Ok(())
    }

    pub async fn activate(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<WorkoutProgram, AppError> {
        // Deactivate all other programs for this user
        sqlx::query(
            "UPDATE workout_programs SET is_active = false WHERE user_id = $1 AND is_active = true",
        )
        .bind(user_id)
        .execute(pool)
        .await?;

        // Activate the requested program and reset progress
        let program = sqlx::query_as::<_, WorkoutProgram>(
            r#"
            UPDATE workout_programs SET
                is_active = true,
                current_week = 1,
                current_day = 1,
                started_at = NOW(),
                completed_at = NULL
            WHERE id = $1 AND user_id = $2
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Program not found".to_string()))?;

        // Reset all workout completions
        sqlx::query(
            "UPDATE program_workouts SET completed_workout_id = NULL, completed_at = NULL WHERE program_id = $1",
        )
        .bind(id)
        .execute(pool)
        .await?;

        Ok(program)
    }

    // Program workouts
    pub async fn add_workout(
        pool: &PgPool,
        program_id: Uuid,
        week_number: i32,
        day_number: i32,
        name: &str,
        template_id: Option<Uuid>,
        is_rest_day: bool,
        notes: Option<&str>,
    ) -> Result<ProgramWorkout, AppError> {
        let workout = sqlx::query_as::<_, ProgramWorkout>(
            r#"
            INSERT INTO program_workouts (id, program_id, week_number, day_number, name, template_id, is_rest_day, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(program_id)
        .bind(week_number)
        .bind(day_number)
        .bind(name)
        .bind(template_id)
        .bind(is_rest_day)
        .bind(notes)
        .fetch_one(pool)
        .await?;

        Ok(workout)
    }

    pub async fn find_workouts(
        pool: &PgPool,
        program_id: Uuid,
    ) -> Result<Vec<ProgramWorkout>, AppError> {
        let workouts = sqlx::query_as::<_, ProgramWorkout>(
            "SELECT * FROM program_workouts WHERE program_id = $1 ORDER BY week_number, day_number",
        )
        .bind(program_id)
        .fetch_all(pool)
        .await?;

        Ok(workouts)
    }

    pub async fn find_workout_by_id(
        pool: &PgPool,
        id: Uuid,
        program_id: Uuid,
    ) -> Result<Option<ProgramWorkout>, AppError> {
        let workout = sqlx::query_as::<_, ProgramWorkout>(
            "SELECT * FROM program_workouts WHERE id = $1 AND program_id = $2",
        )
        .bind(id)
        .bind(program_id)
        .fetch_optional(pool)
        .await?;

        Ok(workout)
    }

    pub async fn delete_workouts_by_program(
        pool: &PgPool,
        program_id: Uuid,
    ) -> Result<(), AppError> {
        sqlx::query("DELETE FROM program_workouts WHERE program_id = $1")
            .bind(program_id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn mark_workout_completed(
        pool: &PgPool,
        id: Uuid,
        workout_id: Uuid,
    ) -> Result<ProgramWorkout, AppError> {
        let workout = sqlx::query_as::<_, ProgramWorkout>(
            r#"
            UPDATE program_workouts SET
                completed_workout_id = $2,
                completed_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(workout_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Program workout not found".to_string()))?;

        Ok(workout)
    }
}
