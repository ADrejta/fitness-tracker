use axum::{extract::State, Extension, Json};
use sqlx::PgPool;
use validator::Validate;

use crate::config::Settings;
use crate::dto::{
    AuthResponse, ErrorResponse, LoginRequest, RefreshRequest, RegisterRequest, TokenResponse,
    UserResponse,
};
use crate::error::AppError;
use crate::middleware::AuthUser;
use crate::services::AuthService;

#[utoipa::path(
    post,
    path = "/api/v1/auth/register",
    tag = "Auth",
    request_body = RegisterRequest,
    responses(
        (status = 200, description = "User registered successfully", body = AuthResponse),
        (status = 400, description = "Validation error", body = ErrorResponse),
        (status = 409, description = "Email already exists", body = ErrorResponse),
    )
)]
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

#[utoipa::path(
    post,
    path = "/api/v1/auth/login",
    tag = "Auth",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login successful", body = AuthResponse),
        (status = 400, description = "Validation error", body = ErrorResponse),
        (status = 401, description = "Invalid credentials", body = ErrorResponse),
    )
)]
pub async fn login(
    State(pool): State<PgPool>,
    State(settings): State<Settings>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let response = AuthService::login(&pool, &settings, &req.email, &req.password).await?;
    Ok(Json(response))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/refresh",
    tag = "Auth",
    request_body = RefreshRequest,
    responses(
        (status = 200, description = "Token refreshed", body = TokenResponse),
        (status = 401, description = "Invalid refresh token", body = ErrorResponse),
    )
)]
pub async fn refresh(
    State(pool): State<PgPool>,
    State(settings): State<Settings>,
    Json(req): Json<RefreshRequest>,
) -> Result<Json<TokenResponse>, AppError> {
    let response = AuthService::refresh(&pool, &settings, &req.refresh_token).await?;
    Ok(Json(response))
}

#[utoipa::path(
    get,
    path = "/api/v1/auth/me",
    tag = "Auth",
    responses(
        (status = 200, description = "Current user info", body = UserResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn me(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<UserResponse>, AppError> {
    let response = AuthService::get_current_user(&pool, auth_user.user_id).await?;
    Ok(Json(response))
}
