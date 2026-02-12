use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::ExerciseQuery;
use crate::error::AppError;
use crate::models::{Equipment, ExerciseCategory, ExerciseTemplate, MuscleGroup};

pub struct ExerciseRepository;

impl ExerciseRepository {
    pub async fn find_all(
        pool: &PgPool,
        user_id: Uuid,
        query: &ExerciseQuery,
    ) -> Result<Vec<ExerciseTemplate>, AppError> {
        let mut sql = String::from(
            r#"
            SELECT
                et.id, et.name, et.category, et.is_custom, et.description, et.user_id,
                COALESCE(
                    (SELECT array_agg(mg.muscle_group) FROM exercise_muscle_groups mg WHERE mg.exercise_id = et.id),
                    ARRAY[]::muscle_group[]
                ) as muscle_groups,
                COALESCE(
                    (SELECT array_agg(eq.equipment) FROM exercise_equipment eq WHERE eq.exercise_id = et.id),
                    ARRAY[]::equipment[]
                ) as equipment,
                et.instructions
            FROM exercise_templates et
            WHERE (et.user_id IS NULL OR et.user_id = $1)
            "#,
        );

        let mut param_count = 1;

        if query.search.is_some() {
            param_count += 1;
            sql.push_str(&format!(" AND et.name ILIKE ${}", param_count));
        }

        if query.category.is_some() {
            param_count += 1;
            sql.push_str(&format!(" AND et.category = ${}", param_count));
        }

        if query.custom_only == Some(true) {
            sql.push_str(" AND et.is_custom = true AND et.user_id = $1");
        }

        if query.muscle_group.is_some() {
            param_count += 1;
            sql.push_str(&format!(
                " AND EXISTS (SELECT 1 FROM exercise_muscle_groups mg WHERE mg.exercise_id = et.id AND mg.muscle_group = ${})",
                param_count
            ));
        }

        if query.equipment.is_some() {
            param_count += 1;
            sql.push_str(&format!(
                " AND EXISTS (SELECT 1 FROM exercise_equipment eq WHERE eq.exercise_id = et.id AND eq.equipment = ${})",
                param_count
            ));
        }

        sql.push_str(" ORDER BY et.is_custom DESC, et.name ASC");

        let mut query_builder = sqlx::query_as::<_, ExerciseRow>(&sql).bind(user_id);

        if let Some(ref search) = query.search {
            query_builder = query_builder.bind(format!("%{}%", search));
        }

        if let Some(ref category) = query.category {
            query_builder = query_builder.bind(category);
        }

        if let Some(ref muscle_group) = query.muscle_group {
            query_builder = query_builder.bind(muscle_group);
        }

        if let Some(ref equipment) = query.equipment {
            query_builder = query_builder.bind(equipment);
        }

        let rows = query_builder.fetch_all(pool).await?;

        Ok(rows.into_iter().map(|r| r.into()).collect())
    }

    pub async fn find_by_id(
        pool: &PgPool,
        id: &str,
        user_id: Uuid,
    ) -> Result<Option<ExerciseTemplate>, AppError> {
        let row = sqlx::query_as::<_, ExerciseRow>(
            r#"
            SELECT
                et.id, et.name, et.category, et.is_custom, et.description, et.user_id,
                COALESCE(
                    (SELECT array_agg(mg.muscle_group) FROM exercise_muscle_groups mg WHERE mg.exercise_id = et.id),
                    ARRAY[]::muscle_group[]
                ) as muscle_groups,
                COALESCE(
                    (SELECT array_agg(eq.equipment) FROM exercise_equipment eq WHERE eq.exercise_id = et.id),
                    ARRAY[]::equipment[]
                ) as equipment,
                et.instructions
            FROM exercise_templates et
            WHERE et.id = $1 AND (et.user_id IS NULL OR et.user_id = $2)
            "#,
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|r| r.into()))
    }

    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        id: &str,
        name: &str,
        muscle_groups: &[MuscleGroup],
        category: &ExerciseCategory,
        equipment: &[Equipment],
        description: Option<&str>,
        instructions: Option<&[String]>,
    ) -> Result<ExerciseTemplate, AppError> {
        let mut tx = pool.begin().await?;

        sqlx::query(
            r#"
            INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions, user_id)
            VALUES ($1, $2, $3, true, $4, $5, $6)
            "#,
        )
        .bind(id)
        .bind(name)
        .bind(category)
        .bind(description)
        .bind(instructions)
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

        for mg in muscle_groups {
            sqlx::query(
                "INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES ($1, $2)",
            )
            .bind(id)
            .bind(mg)
            .execute(&mut *tx)
            .await?;
        }

        for eq in equipment {
            sqlx::query("INSERT INTO exercise_equipment (exercise_id, equipment) VALUES ($1, $2)")
                .bind(id)
                .bind(eq)
                .execute(&mut *tx)
                .await?;
        }

        tx.commit().await?;

        Self::find_by_id(pool, id, user_id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to create exercise".to_string()))
    }

    pub async fn update(
        pool: &PgPool,
        id: &str,
        user_id: Uuid,
        name: Option<&str>,
        muscle_groups: Option<&[MuscleGroup]>,
        category: Option<&ExerciseCategory>,
        equipment: Option<&[Equipment]>,
        description: Option<&str>,
        instructions: Option<&[String]>,
    ) -> Result<ExerciseTemplate, AppError> {
        let mut tx = pool.begin().await?;

        // Verify ownership
        let existing = sqlx::query_scalar::<_, bool>(
            "SELECT is_custom FROM exercise_templates WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(&mut *tx)
        .await?;

        if existing.is_none() {
            return Err(AppError::NotFound("Exercise not found or not editable".to_string()));
        }

        if let Some(name) = name {
            sqlx::query("UPDATE exercise_templates SET name = $1 WHERE id = $2")
                .bind(name)
                .bind(id)
                .execute(&mut *tx)
                .await?;
        }

        if let Some(category) = category {
            sqlx::query("UPDATE exercise_templates SET category = $1 WHERE id = $2")
                .bind(category)
                .bind(id)
                .execute(&mut *tx)
                .await?;
        }

        if let Some(desc) = description {
            sqlx::query("UPDATE exercise_templates SET description = $1 WHERE id = $2")
                .bind(desc)
                .bind(id)
                .execute(&mut *tx)
                .await?;
        }

        if let Some(inst) = instructions {
            sqlx::query("UPDATE exercise_templates SET instructions = $1 WHERE id = $2")
                .bind(inst)
                .bind(id)
                .execute(&mut *tx)
                .await?;
        }

        if let Some(mgs) = muscle_groups {
            sqlx::query("DELETE FROM exercise_muscle_groups WHERE exercise_id = $1")
                .bind(id)
                .execute(&mut *tx)
                .await?;

            for mg in mgs {
                sqlx::query(
                    "INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES ($1, $2)",
                )
                .bind(id)
                .bind(mg)
                .execute(&mut *tx)
                .await?;
            }
        }

        if let Some(eqs) = equipment {
            sqlx::query("DELETE FROM exercise_equipment WHERE exercise_id = $1")
                .bind(id)
                .execute(&mut *tx)
                .await?;

            for eq in eqs {
                sqlx::query(
                    "INSERT INTO exercise_equipment (exercise_id, equipment) VALUES ($1, $2)",
                )
                .bind(id)
                .bind(eq)
                .execute(&mut *tx)
                .await?;
            }
        }

        tx.commit().await?;

        Self::find_by_id(pool, id, user_id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to update exercise".to_string()))
    }

    pub async fn delete(pool: &PgPool, id: &str, user_id: Uuid) -> Result<(), AppError> {
        let result = sqlx::query(
            "DELETE FROM exercise_templates WHERE id = $1 AND user_id = $2 AND is_custom = true",
        )
        .bind(id)
        .bind(user_id)
        .execute(pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound(
                "Exercise not found or not deletable".to_string(),
            ));
        }

        Ok(())
    }
}

#[derive(Debug, sqlx::FromRow)]
struct ExerciseRow {
    id: String,
    name: String,
    category: ExerciseCategory,
    is_custom: bool,
    description: Option<String>,
    user_id: Option<Uuid>,
    muscle_groups: Vec<MuscleGroup>,
    equipment: Vec<Equipment>,
    instructions: Option<Vec<String>>,
}

impl From<ExerciseRow> for ExerciseTemplate {
    fn from(row: ExerciseRow) -> Self {
        ExerciseTemplate {
            id: row.id,
            name: row.name,
            muscle_groups: row.muscle_groups,
            category: row.category,
            equipment: row.equipment,
            is_custom: row.is_custom,
            description: row.description,
            instructions: row.instructions,
            user_id: row.user_id,
        }
    }
}
