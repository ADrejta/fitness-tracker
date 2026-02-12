use chrono::{DateTime, Utc};
use sqlx::PgPool;
use tracing::{debug, error, instrument};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{PersonalRecord, RecordType};

pub struct PersonalRecordRepository;

impl PersonalRecordRepository {
    #[instrument(skip(pool))]
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        exercise_template_id: &str,
        exercise_name: &str,
        record_type: &RecordType,
        value: f64,
        reps: Option<i32>,
        achieved_at: DateTime<Utc>,
        workout_id: Uuid,
    ) -> Result<PersonalRecord, AppError> {
        let record = sqlx::query_as::<_, PersonalRecord>(
            r#"
            INSERT INTO personal_records (id, user_id, exercise_template_id, exercise_name, record_type, value, reps, achieved_at, workout_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(user_id)
        .bind(exercise_template_id)
        .bind(exercise_name)
        .bind(record_type)
        .bind(value)
        .bind(reps)
        .bind(achieved_at)
        .bind(workout_id)
        .fetch_one(pool)
        .await?;

        Ok(record)
    }

    #[instrument(skip(pool), fields(user_id = %user_id, exercise_id = %exercise_template_id))]
    pub async fn find_by_exercise(
        pool: &PgPool,
        user_id: Uuid,
        exercise_template_id: &str,
    ) -> Result<Vec<PersonalRecord>, AppError> {
        debug!("Querying personal records for exercise");
        let records = sqlx::query_as::<_, PersonalRecord>(
            r#"
            SELECT * FROM personal_records
            WHERE user_id = $1 AND exercise_template_id = $2
            ORDER BY achieved_at DESC
            "#,
        )
        .bind(user_id)
        .bind(exercise_template_id)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            error!("Failed to query personal records by exercise: {:?}", e);
            e
        })?;

        debug!("Found {} personal records for exercise", records.len());
        Ok(records)
    }

    #[instrument(skip(pool), fields(user_id = %user_id, limit = limit))]
    pub async fn find_recent(
        pool: &PgPool,
        user_id: Uuid,
        limit: i64,
    ) -> Result<Vec<PersonalRecord>, AppError> {
        debug!("Querying recent personal records");
        let records = sqlx::query_as::<_, PersonalRecord>(
            r#"
            SELECT * FROM personal_records
            WHERE user_id = $1
            ORDER BY achieved_at DESC
            LIMIT $2
            "#,
        )
        .bind(user_id)
        .bind(limit)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            error!("Failed to query personal records: {:?}", e);
            e
        })?;

        debug!("Found {} personal records", records.len());
        Ok(records)
    }

    #[instrument(skip(pool), fields(user_id = %user_id))]
    pub async fn find_all(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Vec<PersonalRecord>, AppError> {
        debug!("Querying all personal records");
        let records = sqlx::query_as::<_, PersonalRecord>(
            r#"
            SELECT * FROM personal_records
            WHERE user_id = $1
            ORDER BY achieved_at DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            error!("Failed to query all personal records: {:?}", e);
            e
        })?;

        debug!("Found {} personal records", records.len());
        Ok(records)
    }

    pub async fn get_current_record(
        pool: &PgPool,
        user_id: Uuid,
        exercise_template_id: &str,
        record_type: &RecordType,
    ) -> Result<Option<PersonalRecord>, AppError> {
        let record = sqlx::query_as::<_, PersonalRecord>(
            r#"
            SELECT * FROM personal_records
            WHERE user_id = $1 AND exercise_template_id = $2 AND record_type = $3
            ORDER BY value DESC
            LIMIT 1
            "#,
        )
        .bind(user_id)
        .bind(exercise_template_id)
        .bind(record_type)
        .fetch_optional(pool)
        .await?;

        Ok(record)
    }
}
