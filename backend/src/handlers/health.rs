use axum::{extract::State, Json};
use serde::Serialize;
use sqlx::PgPool;
use utoipa::ToSchema;

use crate::error::AppError;

#[derive(Serialize, ToSchema)]
pub struct HealthResponse {
    pub status: &'static str,
    pub db: &'static str,
}

#[utoipa::path(
    get,
    path = "/health",
    tag = "Health",
    responses(
        (status = 200, description = "Service is healthy", body = HealthResponse),
        (status = 503, description = "Service unavailable"),
    )
)]
pub async fn health(State(pool): State<PgPool>) -> Result<Json<HealthResponse>, AppError> {
    sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&pool)
        .await?;
    Ok(Json(HealthResponse {
        status: "ok",
        db: "ok",
    }))
}
