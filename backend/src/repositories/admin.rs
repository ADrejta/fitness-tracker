use chrono::{DateTime, NaiveDate, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::{
    AdminMetricsResponse, AdminUserDetailResponse, AdminUserResponse, DailyRegistration,
    TopUserResponse,
};
use crate::error::AppError;

pub struct AdminRepository;

impl AdminRepository {
    pub async fn check_is_admin(pool: &PgPool, user_id: Uuid) -> Result<bool, AppError> {
        let is_admin: bool = sqlx::query_scalar(
            "SELECT is_admin FROM users WHERE id = $1"
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await?
        .unwrap_or(false);

        Ok(is_admin)
    }

    pub async fn list_users(
        pool: &PgPool,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<AdminUserResponse>, i64), AppError> {
        let offset = (page - 1) * page_size;

        let rows = sqlx::query_as::<_, AdminUserRow>(
            r#"
            SELECT
                u.id,
                u.email,
                u.is_admin,
                u.created_at,
                COUNT(w.id) FILTER (WHERE w.status = 'completed') AS workout_count,
                MAX(w.completed_at) AS last_active
            FROM users u
            LEFT JOIN workouts w ON w.user_id = u.id
            GROUP BY u.id, u.email, u.is_admin, u.created_at
            ORDER BY u.created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
            .fetch_one(pool)
            .await?;

        let users = rows
            .into_iter()
            .map(|r| AdminUserResponse {
                id: r.id,
                email: r.email,
                is_admin: r.is_admin,
                created_at: r.created_at,
                workout_count: r.workout_count,
                last_active: r.last_active,
            })
            .collect();

        Ok((users, total))
    }

    pub async fn get_user(
        pool: &PgPool,
        user_id: Uuid,
    ) -> Result<Option<AdminUserDetailResponse>, AppError> {
        let row = sqlx::query_as::<_, AdminUserDetailRow>(
            r#"
            SELECT
                u.id,
                u.email,
                u.is_admin,
                u.created_at,
                COUNT(DISTINCT w.id) FILTER (WHERE w.status = 'completed') AS workout_count,
                MAX(w.completed_at) AS last_active,
                COUNT(ws.id) AS total_sets
            FROM users u
            LEFT JOIN workouts w ON w.user_id = u.id
            LEFT JOIN workout_exercises we ON we.workout_id = w.id AND w.status = 'completed'
            LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
            WHERE u.id = $1
            GROUP BY u.id, u.email, u.is_admin, u.created_at
            "#,
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|r| AdminUserDetailResponse {
            id: r.id,
            email: r.email,
            is_admin: r.is_admin,
            created_at: r.created_at,
            workout_count: r.workout_count,
            last_active: r.last_active,
            total_sets: r.total_sets,
        }))
    }

    pub async fn delete_user(pool: &PgPool, user_id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(user_id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn set_admin_status(
        pool: &PgPool,
        user_id: Uuid,
        is_admin: bool,
    ) -> Result<AdminUserResponse, AppError> {
        let row = sqlx::query_as::<_, AdminUserRow>(
            r#"
            UPDATE users SET is_admin = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING
                id,
                email,
                is_admin,
                created_at,
                0::bigint AS workout_count,
                NULL::timestamptz AS last_active
            "#,
        )
        .bind(user_id)
        .bind(is_admin)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("User {} not found", user_id)))?;

        Ok(AdminUserResponse {
            id: row.id,
            email: row.email,
            is_admin: row.is_admin,
            created_at: row.created_at,
            workout_count: row.workout_count,
            last_active: row.last_active,
        })
    }

    pub async fn get_metrics(pool: &PgPool) -> Result<AdminMetricsResponse, AppError> {
        let (total_users, total_workouts, total_sets, active_today, active_this_week, active_this_month) = tokio::join!(
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users")
                .fetch_one(pool),
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM workouts WHERE status = 'completed'")
                .fetch_one(pool),
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM workout_sets ws JOIN workout_exercises we ON we.id = ws.workout_exercise_id JOIN workouts w ON w.id = we.workout_id WHERE w.status = 'completed'")
                .fetch_one(pool),
            sqlx::query_scalar::<_, i64>("SELECT COUNT(DISTINCT user_id) FROM workouts WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '1 day'")
                .fetch_one(pool),
            sqlx::query_scalar::<_, i64>("SELECT COUNT(DISTINCT user_id) FROM workouts WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '7 days'")
                .fetch_one(pool),
            sqlx::query_scalar::<_, i64>("SELECT COUNT(DISTINCT user_id) FROM workouts WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '30 days'")
                .fetch_one(pool),
        );

        let total_users = total_users?;
        let total_workouts = total_workouts?;
        let total_sets = total_sets?;
        let active_today = active_today?;
        let active_this_week = active_this_week?;
        let active_this_month = active_this_month?;

        let reg_rows = sqlx::query_as::<_, RegRow>(
            r#"
            SELECT DATE(created_at) AS date, COUNT(*) AS count
            FROM users
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
            "#,
        )
        .fetch_all(pool)
        .await?;

        let registrations_by_day = reg_rows
            .into_iter()
            .map(|r| DailyRegistration {
                date: r.date,
                count: r.count,
            })
            .collect();

        let top_rows = sqlx::query_as::<_, TopUserRow>(
            r#"
            SELECT
                u.id,
                u.email,
                COUNT(DISTINCT w.id) FILTER (WHERE w.status = 'completed') AS workout_count,
                COUNT(ws.id) AS total_sets
            FROM users u
            LEFT JOIN workouts w ON w.user_id = u.id
            LEFT JOIN workout_exercises we ON we.workout_id = w.id AND w.status = 'completed'
            LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
            GROUP BY u.id, u.email
            ORDER BY workout_count DESC
            LIMIT 10
            "#,
        )
        .fetch_all(pool)
        .await?;

        let top_users_by_workouts = top_rows
            .into_iter()
            .map(|r| TopUserResponse {
                id: r.id,
                email: r.email,
                workout_count: r.workout_count,
                total_sets: r.total_sets,
            })
            .collect();

        Ok(AdminMetricsResponse {
            total_users,
            total_workouts,
            total_sets,
            active_today,
            active_this_week,
            active_this_month,
            registrations_by_day,
            top_users_by_workouts,
        })
    }
}

#[derive(sqlx::FromRow)]
struct AdminUserRow {
    id: Uuid,
    email: String,
    is_admin: bool,
    created_at: DateTime<Utc>,
    workout_count: i64,
    last_active: Option<DateTime<Utc>>,
}

#[derive(sqlx::FromRow)]
struct AdminUserDetailRow {
    id: Uuid,
    email: String,
    is_admin: bool,
    created_at: DateTime<Utc>,
    workout_count: i64,
    last_active: Option<DateTime<Utc>>,
    total_sets: i64,
}

#[derive(sqlx::FromRow)]
struct RegRow {
    date: NaiveDate,
    count: i64,
}

#[derive(sqlx::FromRow)]
struct TopUserRow {
    id: Uuid,
    email: String,
    workout_count: i64,
    total_sets: i64,
}
