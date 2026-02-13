use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::WorkoutQuery;
use crate::error::AppError;
use crate::models::{Workout, WorkoutExercise, WorkoutSet, WorkoutStatus};

pub struct WorkoutRepository;

impl WorkoutRepository {
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        name: &str,
        template_id: Option<Uuid>,
        notes: Option<&str>,
    ) -> Result<Workout, AppError> {
        let workout = sqlx::query_as::<_, Workout>(
            r#"
            INSERT INTO workouts (id, user_id, name, started_at, total_volume, total_sets, total_reps, status, template_id, notes)
            VALUES ($1, $2, $3, NOW(), 0, 0, 0, 'in-progress', $4, $5)
            RETURNING id, user_id, name, started_at, completed_at, total_volume, total_sets, total_reps, duration, status, template_id, notes
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(user_id)
        .bind(name)
        .bind(template_id)
        .bind(notes)
        .fetch_one(pool)
        .await?;

        Ok(workout)
    }

    pub async fn find_by_id(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<Workout>, AppError> {
        let workout = sqlx::query_as::<_, Workout>(
            r#"
            SELECT id, user_id, name, started_at, completed_at, total_volume, total_sets, total_reps, duration, status, template_id, notes
            FROM workouts
            WHERE id = $1 AND user_id = $2
            "#,
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

        Ok(workout)
    }

    pub async fn find_all(
        pool: &PgPool,
        user_id: Uuid,
        query: &WorkoutQuery,
    ) -> Result<(Vec<WorkoutWithCount>, i64), AppError> {
        let limit = query.limit.unwrap_or(20).min(100);
        let offset = query.offset.unwrap_or(0).max(0);

        let total = if let Some(ref status) = query.status {
            sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM workouts WHERE user_id = $1 AND status = $2",
            )
            .bind(user_id)
            .bind(status)
            .fetch_one(pool)
            .await?
        } else {
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM workouts WHERE user_id = $1")
                .bind(user_id)
                .fetch_one(pool)
                .await?
        };

        let workouts = if let Some(ref status) = query.status {
            sqlx::query_as::<_, WorkoutWithCount>(
                r#"
                SELECT
                    w.id, w.user_id, w.name, w.started_at, w.completed_at,
                    w.total_volume, w.total_sets, w.total_reps, w.duration,
                    w.status, w.template_id, w.notes,
                    (SELECT COUNT(*)::int FROM workout_exercises WHERE workout_id = w.id) as exercise_count
                FROM workouts w
                WHERE w.user_id = $1 AND w.status = $2
                ORDER BY w.started_at DESC
                LIMIT $3 OFFSET $4
                "#,
            )
            .bind(user_id)
            .bind(status)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool)
            .await?
        } else {
            sqlx::query_as::<_, WorkoutWithCount>(
                r#"
                SELECT
                    w.id, w.user_id, w.name, w.started_at, w.completed_at,
                    w.total_volume, w.total_sets, w.total_reps, w.duration,
                    w.status, w.template_id, w.notes,
                    (SELECT COUNT(*)::int FROM workout_exercises WHERE workout_id = w.id) as exercise_count
                FROM workouts w
                WHERE w.user_id = $1
                ORDER BY w.started_at DESC
                LIMIT $2 OFFSET $3
                "#,
            )
            .bind(user_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool)
            .await?
        };

        Ok((workouts, total))
    }

    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
        name: Option<&str>,
        notes: Option<&str>,
    ) -> Result<Workout, AppError> {
        if let Some(name) = name {
            sqlx::query("UPDATE workouts SET name = $1 WHERE id = $2 AND user_id = $3")
                .bind(name)
                .bind(id)
                .bind(user_id)
                .execute(pool)
                .await?;
        }

        if let Some(notes) = notes {
            sqlx::query("UPDATE workouts SET notes = $1 WHERE id = $2 AND user_id = $3")
                .bind(notes)
                .bind(id)
                .bind(user_id)
                .execute(pool)
                .await?;
        }

        Self::find_by_id(pool, id, user_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Workout not found".to_string()))
    }

    pub async fn delete(pool: &PgPool, id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        let result = sqlx::query("DELETE FROM workouts WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Workout not found".to_string()));
        }

        Ok(())
    }

    pub async fn complete(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Workout, AppError> {
        // Calculate totals from sets
        let stats = sqlx::query_as::<_, WorkoutStats>(
            r#"
            SELECT
                COALESCE(SUM(CASE WHEN ws.is_completed AND NOT ws.is_warmup THEN ws.actual_weight * ws.actual_reps ELSE 0 END), 0) as total_volume,
                COALESCE(COUNT(CASE WHEN ws.is_completed AND NOT ws.is_warmup THEN 1 END), 0)::int as total_sets,
                COALESCE(SUM(CASE WHEN ws.is_completed AND NOT ws.is_warmup THEN ws.actual_reps ELSE 0 END), 0)::int as total_reps
            FROM workout_exercises we
            JOIN workout_sets ws ON ws.workout_exercise_id = we.id
            WHERE we.workout_id = $1
            "#,
        )
        .bind(id)
        .fetch_one(pool)
        .await?;

        let workout = sqlx::query_as::<_, Workout>(
            r#"
            UPDATE workouts
            SET status = 'completed',
                completed_at = NOW(),
                total_volume = $3,
                total_sets = $4,
                total_reps = $5,
                duration = EXTRACT(EPOCH FROM (NOW() - started_at))::int
            WHERE id = $1 AND user_id = $2
            RETURNING id, user_id, name, started_at, completed_at, total_volume, total_sets, total_reps, duration, status, template_id, notes
            "#,
        )
        .bind(id)
        .bind(user_id)
        .bind(stats.total_volume)
        .bind(stats.total_sets)
        .bind(stats.total_reps)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Workout not found".to_string()))?;

        Ok(workout)
    }

    pub async fn cancel(pool: &PgPool, id: Uuid, user_id: Uuid) -> Result<Workout, AppError> {
        let workout = sqlx::query_as::<_, Workout>(
            r#"
            UPDATE workouts
            SET status = 'cancelled',
                duration = EXTRACT(EPOCH FROM (NOW() - started_at))::int
            WHERE id = $1 AND user_id = $2
            RETURNING id, user_id, name, started_at, completed_at, total_volume, total_sets, total_reps, duration, status, template_id, notes
            "#,
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Workout not found".to_string()))?;

        Ok(workout)
    }

    // Exercise methods
    pub async fn add_exercise(
        pool: &PgPool,
        workout_id: Uuid,
        exercise_template_id: &str,
        exercise_name: &str,
        notes: Option<&str>,
        superset_id: Option<Uuid>,
    ) -> Result<WorkoutExercise, AppError> {
        let order_index = sqlx::query_scalar::<_, i32>(
            "SELECT COALESCE(MAX(order_index), -1) + 1 FROM workout_exercises WHERE workout_id = $1",
        )
        .bind(workout_id)
        .fetch_one(pool)
        .await?;

        let exercise = sqlx::query_as::<_, WorkoutExercise>(
            r#"
            INSERT INTO workout_exercises (id, workout_id, exercise_template_id, exercise_name, notes, order_index, superset_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, workout_id, exercise_template_id, exercise_name, notes, order_index, superset_id
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(workout_id)
        .bind(exercise_template_id)
        .bind(exercise_name)
        .bind(notes)
        .bind(order_index)
        .bind(superset_id)
        .fetch_one(pool)
        .await?;

        Ok(exercise)
    }

    pub async fn get_exercises(
        pool: &PgPool,
        workout_id: Uuid,
    ) -> Result<Vec<WorkoutExercise>, AppError> {
        let exercises = sqlx::query_as::<_, WorkoutExercise>(
            r#"
            SELECT id, workout_id, exercise_template_id, exercise_name, notes, order_index, superset_id
            FROM workout_exercises
            WHERE workout_id = $1
            ORDER BY order_index
            "#,
        )
        .bind(workout_id)
        .fetch_all(pool)
        .await?;

        Ok(exercises)
    }

    pub async fn update_exercise(
        pool: &PgPool,
        exercise_id: Uuid,
        notes: Option<&str>,
    ) -> Result<WorkoutExercise, AppError> {
        let exercise = sqlx::query_as::<_, WorkoutExercise>(
            r#"
            UPDATE workout_exercises SET notes = $1 WHERE id = $2
            RETURNING id, workout_id, exercise_template_id, exercise_name, notes, order_index, superset_id
            "#,
        )
        .bind(notes)
        .bind(exercise_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Exercise not found".to_string()))?;

        Ok(exercise)
    }

    pub async fn delete_exercise(pool: &PgPool, exercise_id: Uuid) -> Result<(), AppError> {
        let result = sqlx::query("DELETE FROM workout_exercises WHERE id = $1")
            .bind(exercise_id)
            .execute(pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Exercise not found".to_string()));
        }

        Ok(())
    }

    // Set methods
    pub async fn add_set(
        pool: &PgPool,
        exercise_id: Uuid,
        target_reps: Option<i32>,
        target_weight: Option<f64>,
        is_warmup: bool,
    ) -> Result<WorkoutSet, AppError> {
        let set_number = sqlx::query_scalar::<_, i32>(
            "SELECT COALESCE(MAX(set_number), 0) + 1 FROM workout_sets WHERE workout_exercise_id = $1",
        )
        .bind(exercise_id)
        .fetch_one(pool)
        .await?;

        let set = sqlx::query_as::<_, WorkoutSet>(
            r#"
            INSERT INTO workout_sets (id, workout_exercise_id, set_number, target_reps, target_weight, is_warmup, is_completed)
            VALUES ($1, $2, $3, $4, $5, $6, false)
            RETURNING id, workout_exercise_id, set_number, target_reps, actual_reps, target_weight, actual_weight, is_warmup, is_completed, completed_at
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(exercise_id)
        .bind(set_number)
        .bind(target_reps)
        .bind(target_weight)
        .bind(is_warmup)
        .fetch_one(pool)
        .await?;

        Ok(set)
    }

    pub async fn get_sets(pool: &PgPool, exercise_id: Uuid) -> Result<Vec<WorkoutSet>, AppError> {
        let sets = sqlx::query_as::<_, WorkoutSet>(
            r#"
            SELECT id, workout_exercise_id, set_number, target_reps, actual_reps, target_weight, actual_weight, is_warmup, is_completed, completed_at
            FROM workout_sets
            WHERE workout_exercise_id = $1
            ORDER BY set_number
            "#,
        )
        .bind(exercise_id)
        .fetch_all(pool)
        .await?;

        Ok(sets)
    }

    pub async fn update_set(
        pool: &PgPool,
        set_id: Uuid,
        target_reps: Option<i32>,
        actual_reps: Option<i32>,
        target_weight: Option<f64>,
        actual_weight: Option<f64>,
        is_warmup: Option<bool>,
        is_completed: Option<bool>,
    ) -> Result<WorkoutSet, AppError> {
        let completed_at: Option<DateTime<Utc>> = if is_completed == Some(true) {
            Some(Utc::now())
        } else if is_completed == Some(false) {
            None
        } else {
            // Keep existing
            sqlx::query_scalar::<_, Option<DateTime<Utc>>>(
                "SELECT completed_at FROM workout_sets WHERE id = $1",
            )
            .bind(set_id)
            .fetch_one(pool)
            .await?
        };

        let set = sqlx::query_as::<_, WorkoutSet>(
            r#"
            UPDATE workout_sets
            SET
                target_reps = COALESCE($2, target_reps),
                actual_reps = COALESCE($3, actual_reps),
                target_weight = COALESCE($4, target_weight),
                actual_weight = COALESCE($5, actual_weight),
                is_warmup = COALESCE($6, is_warmup),
                is_completed = COALESCE($7, is_completed),
                completed_at = $8
            WHERE id = $1
            RETURNING id, workout_exercise_id, set_number, target_reps, actual_reps, target_weight, actual_weight, is_warmup, is_completed, completed_at
            "#,
        )
        .bind(set_id)
        .bind(target_reps)
        .bind(actual_reps)
        .bind(target_weight)
        .bind(actual_weight)
        .bind(is_warmup)
        .bind(is_completed)
        .bind(completed_at)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Set not found".to_string()))?;

        Ok(set)
    }

    pub async fn delete_set(pool: &PgPool, set_id: Uuid) -> Result<(), AppError> {
        let result = sqlx::query("DELETE FROM workout_sets WHERE id = $1")
            .bind(set_id)
            .execute(pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Set not found".to_string()));
        }

        Ok(())
    }

    // Superset methods
    pub async fn create_superset(
        pool: &PgPool,
        workout_id: Uuid,
        exercise_ids: &[Uuid],
    ) -> Result<Uuid, AppError> {
        let superset_id = Uuid::new_v4();

        // Update all specified exercises with the new superset_id
        sqlx::query(
            r#"
            UPDATE workout_exercises
            SET superset_id = $1
            WHERE id = ANY($2) AND workout_id = $3
            "#,
        )
        .bind(superset_id)
        .bind(exercise_ids)
        .bind(workout_id)
        .execute(pool)
        .await?;

        Ok(superset_id)
    }

    pub async fn remove_superset(
        pool: &PgPool,
        workout_id: Uuid,
        superset_id: Uuid,
    ) -> Result<(), AppError> {
        let result = sqlx::query(
            r#"
            UPDATE workout_exercises
            SET superset_id = NULL
            WHERE superset_id = $1 AND workout_id = $2
            "#,
        )
        .bind(superset_id)
        .bind(workout_id)
        .execute(pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Superset not found".to_string()));
        }

        Ok(())
    }

    pub async fn get_exercises_in_superset(
        pool: &PgPool,
        superset_id: Uuid,
    ) -> Result<Vec<WorkoutExercise>, AppError> {
        let exercises = sqlx::query_as::<_, WorkoutExercise>(
            r#"
            SELECT id, workout_id, exercise_template_id, exercise_name, notes, order_index, superset_id
            FROM workout_exercises
            WHERE superset_id = $1
            ORDER BY order_index
            "#,
        )
        .bind(superset_id)
        .fetch_all(pool)
        .await?;

        Ok(exercises)
    }

    pub async fn update_exercise_superset(
        pool: &PgPool,
        exercise_id: Uuid,
        superset_id: Option<Uuid>,
    ) -> Result<WorkoutExercise, AppError> {
        let exercise = sqlx::query_as::<_, WorkoutExercise>(
            r#"
            UPDATE workout_exercises SET superset_id = $1 WHERE id = $2
            RETURNING id, workout_id, exercise_template_id, exercise_name, notes, order_index, superset_id
            "#,
        )
        .bind(superset_id)
        .bind(exercise_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Exercise not found".to_string()))?;

        Ok(exercise)
    }
}

#[derive(Debug, sqlx::FromRow)]
pub struct WorkoutWithCount {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub total_volume: f64,
    pub total_sets: i32,
    pub total_reps: i32,
    pub duration: Option<i32>,
    pub status: WorkoutStatus,
    pub template_id: Option<Uuid>,
    pub notes: Option<String>,
    pub exercise_count: i32,
}

#[derive(Debug, sqlx::FromRow)]
struct WorkoutStats {
    total_volume: f64,
    total_sets: i32,
    total_reps: i32,
}
