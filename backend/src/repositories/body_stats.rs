use chrono::NaiveDate;
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::MeasurementQuery;
use crate::error::AppError;
use crate::models::{BodyMeasurement, BodyStatsGoal, GoalType, MeasurementType};

pub struct BodyStatsRepository;

impl BodyStatsRepository {
    // Measurements
    pub async fn create_measurement(
        pool: &PgPool,
        user_id: Uuid,
        date: NaiveDate,
        weight: Option<f64>,
        body_fat_percentage: Option<f64>,
        chest: Option<f64>,
        waist: Option<f64>,
        hips: Option<f64>,
        left_bicep: Option<f64>,
        right_bicep: Option<f64>,
        left_thigh: Option<f64>,
        right_thigh: Option<f64>,
        neck: Option<f64>,
        shoulders: Option<f64>,
        left_calf: Option<f64>,
        right_calf: Option<f64>,
        left_forearm: Option<f64>,
        right_forearm: Option<f64>,
        notes: Option<&str>,
    ) -> Result<BodyMeasurement, AppError> {
        let measurement = sqlx::query_as::<_, BodyMeasurement>(
            r#"
            INSERT INTO body_measurements (
                id, user_id, date, weight, body_fat_percentage, chest, waist, hips,
                left_bicep, right_bicep, left_thigh, right_thigh, neck, shoulders,
                left_calf, right_calf, left_forearm, right_forearm, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(user_id)
        .bind(date)
        .bind(weight)
        .bind(body_fat_percentage)
        .bind(chest)
        .bind(waist)
        .bind(hips)
        .bind(left_bicep)
        .bind(right_bicep)
        .bind(left_thigh)
        .bind(right_thigh)
        .bind(neck)
        .bind(shoulders)
        .bind(left_calf)
        .bind(right_calf)
        .bind(left_forearm)
        .bind(right_forearm)
        .bind(notes)
        .fetch_one(pool)
        .await?;

        Ok(measurement)
    }

    pub async fn find_measurement_by_id(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<BodyMeasurement>, AppError> {
        let measurement = sqlx::query_as::<_, BodyMeasurement>(
            "SELECT * FROM body_measurements WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

        Ok(measurement)
    }

    pub async fn find_measurements(
        pool: &PgPool,
        user_id: Uuid,
        query: &MeasurementQuery,
    ) -> Result<(Vec<BodyMeasurement>, i64), AppError> {
        let limit = query.limit.unwrap_or(50);
        let offset = query.offset.unwrap_or(0);

        let mut count_sql = String::from("SELECT COUNT(*) FROM body_measurements WHERE user_id = $1");
        let mut sql = String::from("SELECT * FROM body_measurements WHERE user_id = $1");

        if query.start_date.is_some() {
            count_sql.push_str(" AND date >= $2");
            sql.push_str(" AND date >= $2");
        }

        if query.end_date.is_some() {
            let param = if query.start_date.is_some() { "$3" } else { "$2" };
            count_sql.push_str(&format!(" AND date <= {}", param));
            sql.push_str(&format!(" AND date <= {}", param));
        }

        sql.push_str(" ORDER BY date DESC LIMIT $");
        let limit_param = if query.start_date.is_some() && query.end_date.is_some() {
            "4"
        } else if query.start_date.is_some() || query.end_date.is_some() {
            "3"
        } else {
            "2"
        };
        sql.push_str(limit_param);
        sql.push_str(" OFFSET $");
        let offset_param = if query.start_date.is_some() && query.end_date.is_some() {
            "5"
        } else if query.start_date.is_some() || query.end_date.is_some() {
            "4"
        } else {
            "3"
        };
        sql.push_str(offset_param);

        let total = {
            let mut q = sqlx::query_scalar::<_, i64>(&count_sql).bind(user_id);
            if let Some(start) = query.start_date {
                q = q.bind(start);
            }
            if let Some(end) = query.end_date {
                q = q.bind(end);
            }
            q.fetch_one(pool).await?
        };

        let measurements = {
            let mut q = sqlx::query_as::<_, BodyMeasurement>(&sql).bind(user_id);
            if let Some(start) = query.start_date {
                q = q.bind(start);
            }
            if let Some(end) = query.end_date {
                q = q.bind(end);
            }
            q = q.bind(limit).bind(offset);
            q.fetch_all(pool).await?
        };

        Ok((measurements, total))
    }

    pub async fn update_measurement(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
        date: Option<NaiveDate>,
        weight: Option<f64>,
        body_fat_percentage: Option<f64>,
        chest: Option<f64>,
        waist: Option<f64>,
        hips: Option<f64>,
        left_bicep: Option<f64>,
        right_bicep: Option<f64>,
        left_thigh: Option<f64>,
        right_thigh: Option<f64>,
        neck: Option<f64>,
        shoulders: Option<f64>,
        left_calf: Option<f64>,
        right_calf: Option<f64>,
        left_forearm: Option<f64>,
        right_forearm: Option<f64>,
        notes: Option<&str>,
    ) -> Result<BodyMeasurement, AppError> {
        let measurement = sqlx::query_as::<_, BodyMeasurement>(
            r#"
            UPDATE body_measurements SET
                date = COALESCE($3, date),
                weight = COALESCE($4, weight),
                body_fat_percentage = COALESCE($5, body_fat_percentage),
                chest = COALESCE($6, chest),
                waist = COALESCE($7, waist),
                hips = COALESCE($8, hips),
                left_bicep = COALESCE($9, left_bicep),
                right_bicep = COALESCE($10, right_bicep),
                left_thigh = COALESCE($11, left_thigh),
                right_thigh = COALESCE($12, right_thigh),
                neck = COALESCE($13, neck),
                shoulders = COALESCE($14, shoulders),
                left_calf = COALESCE($15, left_calf),
                right_calf = COALESCE($16, right_calf),
                left_forearm = COALESCE($17, left_forearm),
                right_forearm = COALESCE($18, right_forearm),
                notes = COALESCE($19, notes)
            WHERE id = $1 AND user_id = $2
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(user_id)
        .bind(date)
        .bind(weight)
        .bind(body_fat_percentage)
        .bind(chest)
        .bind(waist)
        .bind(hips)
        .bind(left_bicep)
        .bind(right_bicep)
        .bind(left_thigh)
        .bind(right_thigh)
        .bind(neck)
        .bind(shoulders)
        .bind(left_calf)
        .bind(right_calf)
        .bind(left_forearm)
        .bind(right_forearm)
        .bind(notes)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Measurement not found".to_string()))?;

        Ok(measurement)
    }

    pub async fn delete_measurement(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<(), AppError> {
        let result = sqlx::query("DELETE FROM body_measurements WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Measurement not found".to_string()));
        }

        Ok(())
    }

    pub async fn get_latest_measurement(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Option<BodyMeasurement>, AppError> {
        let measurement = sqlx::query_as::<_, BodyMeasurement>(
            "SELECT * FROM body_measurements WHERE user_id = $1 ORDER BY date DESC LIMIT 1",
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

        Ok(measurement)
    }

    // Goals
    pub async fn create_goal(
        pool: &PgPool,
        user_id: Uuid,
        goal_type: &GoalType,
        measurement_type: Option<&MeasurementType>,
        target_value: f64,
        start_value: f64,
        start_date: NaiveDate,
        target_date: Option<NaiveDate>,
    ) -> Result<BodyStatsGoal, AppError> {
        let goal = sqlx::query_as::<_, BodyStatsGoal>(
            r#"
            INSERT INTO body_stats_goals (id, user_id, goal_type, measurement_type, target_value, start_value, start_date, target_date, is_completed)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
            RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(user_id)
        .bind(goal_type)
        .bind(measurement_type)
        .bind(target_value)
        .bind(start_value)
        .bind(start_date)
        .bind(target_date)
        .fetch_one(pool)
        .await?;

        Ok(goal)
    }

    pub async fn find_goal_by_id(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<BodyStatsGoal>, AppError> {
        let goal = sqlx::query_as::<_, BodyStatsGoal>(
            "SELECT * FROM body_stats_goals WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

        Ok(goal)
    }

    pub async fn find_goals(pool: &PgPool, user_id: Uuid) -> Result<Vec<BodyStatsGoal>, AppError> {
        let goals = sqlx::query_as::<_, BodyStatsGoal>(
            "SELECT * FROM body_stats_goals WHERE user_id = $1 ORDER BY start_date DESC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        Ok(goals)
    }

    pub async fn update_goal(
        pool: &PgPool,
        id: Uuid,
        user_id: Uuid,
        target_value: Option<f64>,
        target_date: Option<NaiveDate>,
        is_completed: Option<bool>,
    ) -> Result<BodyStatsGoal, AppError> {
        let completed_at = if is_completed == Some(true) {
            Some(chrono::Utc::now())
        } else {
            None
        };

        let goal = sqlx::query_as::<_, BodyStatsGoal>(
            r#"
            UPDATE body_stats_goals SET
                target_value = COALESCE($3, target_value),
                target_date = COALESCE($4, target_date),
                is_completed = COALESCE($5, is_completed),
                completed_at = CASE WHEN $5 = true THEN $6 ELSE completed_at END
            WHERE id = $1 AND user_id = $2
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(user_id)
        .bind(target_value)
        .bind(target_date)
        .bind(is_completed)
        .bind(completed_at)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Goal not found".to_string()))?;

        Ok(goal)
    }

    pub async fn delete_goal(pool: &PgPool, id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        let result = sqlx::query("DELETE FROM body_stats_goals WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Goal not found".to_string()));
        }

        Ok(())
    }
}
