use axum::{extract::State, Extension, Json};
use sqlx::PgPool;
use validator::Validate;

use crate::config::Settings;
use crate::dto::{
    AuthResponse, LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserResponse,
};
use crate::error::AppError;
use crate::middleware::AuthUser;
use crate::services::AuthService;

pub async fn register(
    State(pool): State<PgPool>,
    State(settings): State<Settings>,
    Json(req): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let response = AuthService::register(&pool, &settings, &req.email, &req.password).await?;
    Ok(Json(response))
}

pub async fn login(
    State(pool): State<PgPool>,
    State(settings): State<Settings>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    println!("Request {:?}",req);
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let response = AuthService::login(&pool, &settings, &req.email, &req.password).await?;
    Ok(Json(response))
}

pub async fn refresh(
    State(pool): State<PgPool>,
    State(settings): State<Settings>,
    Json(req): Json<RefreshRequest>,
) -> Result<Json<TokenResponse>, AppError> {
    let response = AuthService::refresh(&pool, &settings, &req.refresh_token).await?;
    Ok(Json(response))
}

pub async fn me(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<UserResponse>, AppError> {
    let response = AuthService::get_current_user(&pool, auth_user.user_id).await?;
    Ok(Json(response))
}
