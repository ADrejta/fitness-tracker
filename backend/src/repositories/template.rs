use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::CreateTemplateExerciseRequest;
use crate::error::AppError;
use crate::models::{TemplateExercise, TemplateSet, WorkoutTemplate};

pub struct TemplateRepository;

impl TemplateRepository {
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        name: &str,
        description: Option<&str>,
        exercises: &[CreateTemplateExerciseRequest],
        estimated_duration: Option<i32>,
        tags: Option<&[String]>,
    ) -> Result<WorkoutTemplate, AppError> {
        let mut tx = pool.begin().await?;

        let template_id = Uuid::new_v4();

        sqlx::query(
            r#"
            INSERT INTO workout_templates (id, user_id, name, description, estimated_duration, created_at, usage_count, tags)
            VALUES ($1, $2, $3, $4, $5, NOW(), 0, $6)
            "#,
        )
        .bind(template_id)
        .bind(user_id)
        .bind(name)
        .bind(description)
        .bind(estimated_duration)
        .bind(tags)
        .execute(&mut *tx)
        .await?;

        for (index, exercise) in exercises.iter().enumerate() {
            let exercise_id = Uuid::new_v4();

            sqlx::query(
                r#"
                INSERT INTO template_exercises (id, template_id, exercise_template_id, exercise_name, notes, rest_seconds, order_index, superset_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                "#,
            )
            .bind(exercise_id)
            .bind(template_id)
            .bind(&exercise.exercise_template_id)
            .bind(&exercise.exercise_name)
            .bind(&exercise.notes)
            .bind(exercise.rest_seconds)
            .bind(index as i32)
            .bind(exercise.superset_id)
            .execute(&mut *tx)
            .await?;

            for (set_index, set) in exercise.sets.iter().enumerate() {
                sqlx::query(
                    r#"
                    INSERT INTO template_sets (id, template_exercise_id, set_number, target_reps, target_weight, is_warmup)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    "#,
                )
                .bind(Uuid::new_v4())
                .bind(exercise_id)
                .bind((set_index + 1) as i32)
                .bind(set.target_reps)
                .bind(set.target_weight)
                .bind(set.is_warmup)
                .execute(&mut *tx)
                .await?;
            }
        }

        tx.commit().await?;

        Self::find_by_id(pool, template_id, user_id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to create template".to_string()))
    }

    pub async fn find_by_id(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<WorkoutTemplate>, AppError> {
        let template = sqlx::query_as::<_, WorkoutTemplateRow>(
            r#"
            SELECT id, user_id, name, description, estimated_duration, created_at, last_used_at, usage_count, tags
            FROM workout_templates
            WHERE id = $1 AND user_id = $2
            "#,
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

        Ok(template.map(|t| WorkoutTemplate {
            id: t.id,
            user_id: t.user_id,
            name: t.name,
            description: t.description,
            estimated_duration: t.estimated_duration,
            created_at: t.created_at,
            last_used_at: t.last_used_at,
            usage_count: t.usage_count,
            tags: t.tags,
        }))
    }

    pub async fn find_all(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<TemplateSummary>, AppError> {
        let templates = sqlx::query_as::<_, TemplateSummary>(
            r#"
            SELECT
                t.id, t.name, t.description, t.estimated_duration, t.created_at,
                t.last_used_at, t.usage_count, t.tags,
                (SELECT COUNT(*)::int FROM template_exercises WHERE template_id = t.id) as exercise_count
            FROM workout_templates t
            WHERE t.user_id = $1
            ORDER BY t.created_at DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        Ok(templates)
    }

    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
        name: Option<&str>,
        description: Option<&str>,
        exercises: Option<&[CreateTemplateExerciseRequest]>,
        estimated_duration: Option<i32>,
        tags: Option<&[String]>,
    ) -> Result<WorkoutTemplate, AppError> {
        let mut tx = pool.begin().await?;

        // Verify ownership
        let exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM workout_templates WHERE id = $1 AND user_id = $2)",
        )
        .bind(id)
        .bind(user_id)
        .fetch_one(&mut *tx)
        .await?;

        if !exists {
            return Err(AppError::NotFound("Template not found".to_string()));
        }

        if let Some(name) = name {
            sqlx::query("UPDATE workout_templates SET name = $1 WHERE id = $2")
                .bind(name)
                .bind(id)
                .execute(&mut *tx)
                .await?;
        }

        if let Some(desc) = description {
            sqlx::query("UPDATE workout_templates SET description = $1 WHERE id = $2")
                .bind(desc)
                .bind(id)
                .execute(&mut *tx)
                .await?;
        }

        if let Some(dur) = estimated_duration {
            sqlx::query("UPDATE workout_templates SET estimated_duration = $1 WHERE id = $2")
                .bind(dur)
                .bind(id)
                .execute(&mut *tx)
                .await?;
        }

        if let Some(tags) = tags {
            sqlx::query("UPDATE workout_templates SET tags = $1 WHERE id = $2")
                .bind(tags)
                .bind(id)
                .execute(&mut *tx)
                .await?;
        }

        if let Some(exercises) = exercises {
            // Delete existing exercises and sets
            sqlx::query(
                "DELETE FROM template_sets WHERE template_exercise_id IN (SELECT id FROM template_exercises WHERE template_id = $1)",
            )
            .bind(id)
            .execute(&mut *tx)
            .await?;

            sqlx::query("DELETE FROM template_exercises WHERE template_id = $1")
                .bind(id)
                .execute(&mut *tx)
                .await?;

            // Insert new exercises and sets
            for (index, exercise) in exercises.iter().enumerate() {
                let exercise_id = Uuid::new_v4();

                sqlx::query(
                    r#"
                    INSERT INTO template_exercises (id, template_id, exercise_template_id, exercise_name, notes, rest_seconds, order_index, superset_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    "#,
                )
                .bind(exercise_id)
                .bind(id)
                .bind(&exercise.exercise_template_id)
                .bind(&exercise.exercise_name)
                .bind(&exercise.notes)
                .bind(exercise.rest_seconds)
                .bind(index as i32)
                .bind(exercise.superset_id)
                .execute(&mut *tx)
                .await?;

                for (set_index, set) in exercise.sets.iter().enumerate() {
                    sqlx::query(
                        r#"
                        INSERT INTO template_sets (id, template_exercise_id, set_number, target_reps, target_weight, is_warmup)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        "#,
                    )
                    .bind(Uuid::new_v4())
                    .bind(exercise_id)
                    .bind((set_index + 1) as i32)
                    .bind(set.target_reps)
                    .bind(set.target_weight)
                    .bind(set.is_warmup)
                    .execute(&mut *tx)
                    .await?;
                }
            }
        }

        tx.commit().await?;

        Self::find_by_id(pool, id, user_id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to update template".to_string()))
    }

    pub async fn delete(pool: &PgPool, id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        let result = sqlx::query("DELETE FROM workout_templates WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Template not found".to_string()));
        }

        Ok(())
    }

    pub async fn get_exercises_with_sets(
        pool: &PgPool,
        template_id: Uuid,
    ) -> Result<Vec<TemplateExercise>, AppError> {
        // Single JOIN query instead of N+1
        let rows = sqlx::query_as::<_, TemplateExerciseWithSetRow>(
            r#"
            SELECT
                te.id as exercise_id, te.template_id, te.exercise_template_id, te.exercise_name,
                te.notes, te.rest_seconds, te.order_index, te.superset_id,
                ts.set_number, ts.target_reps, ts.target_weight, ts.is_warmup
            FROM template_exercises te
            LEFT JOIN template_sets ts ON ts.template_exercise_id = te.id
            WHERE te.template_id = $1
            ORDER BY te.order_index, ts.set_number
            "#,
        )
        .bind(template_id)
        .fetch_all(pool)
        .await?;

        // Group flat rows into exercises with nested sets
        let mut exercises: Vec<TemplateExercise> = Vec::new();
        let mut current_exercise_id: Option<Uuid> = None;

        for row in rows {
            if current_exercise_id != Some(row.exercise_id) {
                current_exercise_id = Some(row.exercise_id);
                exercises.push(TemplateExercise {
                    id: row.exercise_id,
                    exercise_template_id: row.exercise_template_id.clone(),
                    exercise_name: row.exercise_name.clone(),
                    sets: Vec::new(),
                    notes: row.notes.clone(),
                    rest_seconds: row.rest_seconds,
                    superset_id: row.superset_id,
                });
            }

            // If there's a set (LEFT JOIN may produce NULL for exercises with no sets)
            if let Some(set_number) = row.set_number {
                if let Some(exercise) = exercises.last_mut() {
                    exercise.sets.push(TemplateSet {
                        set_number,
                        target_reps: row.target_reps.unwrap_or(0),
                        target_weight: row.target_weight,
                        is_warmup: row.is_warmup.unwrap_or(false),
                    });
                }
            }
        }

        Ok(exercises)
    }

    pub async fn increment_usage(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE workout_templates SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = $1",
        )
        .bind(id)
        .execute(pool)
        .await?;

        Ok(())
    }
}

#[derive(Debug, sqlx::FromRow)]
struct WorkoutTemplateRow {
    id: Uuid,
    user_id: Uuid,
    name: String,
    description: Option<String>,
    estimated_duration: Option<i32>,
    created_at: DateTime<Utc>,
    last_used_at: Option<DateTime<Utc>>,
    usage_count: i32,
    tags: Option<Vec<String>>,
}

#[derive(Debug, sqlx::FromRow)]
pub struct TemplateSummary {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub estimated_duration: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
    pub usage_count: i32,
    pub tags: Option<Vec<String>>,
    pub exercise_count: i32,
}

#[allow(dead_code)]
#[derive(Debug, sqlx::FromRow)]
struct TemplateExerciseWithSetRow {
    // Exercise fields
    exercise_id: Uuid,
    template_id: Uuid,
    exercise_template_id: String,
    exercise_name: String,
    notes: Option<String>,
    rest_seconds: Option<i32>,
    order_index: i32,
    superset_id: Option<Uuid>,
    // Set fields (nullable due to LEFT JOIN)
    set_number: Option<i32>,
    target_reps: Option<i32>,
    target_weight: Option<f64>,
    is_warmup: Option<bool>,
}
