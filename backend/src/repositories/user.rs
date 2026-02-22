use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::User;

pub struct UserRepository;

impl UserRepository {
    pub async fn create(
        pool: &PgPool,
        email: &str,
        password_hash: &str,
    ) -> Result<User, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (id, email, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING id, email, password_hash, is_admin, created_at, updated_at
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(email)
        .bind(password_hash)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }

    pub async fn find_by_email(pool: &PgPool, email: &str) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"
            SELECT id, email, password_hash, is_admin, created_at, updated_at
            FROM users
            WHERE email = $1
            "#,
        )
        .bind(email)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"
            SELECT id, email, password_hash, is_admin, created_at, updated_at
            FROM users
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    pub async fn update_password(
        pool: &PgPool,
        id: Uuid,
        password_hash: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1",
        )
        .bind(id)
        .bind(password_hash)
        .execute(pool)
        .await?;

        Ok(())
    }
}
