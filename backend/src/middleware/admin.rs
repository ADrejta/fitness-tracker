use axum::{
    extract::{Request, State},
    http::header::AUTHORIZATION,
    middleware::Next,
    response::Response,
};
use sqlx::PgPool;

use crate::config::Settings;
use crate::error::AppError;
use crate::middleware::AuthUser;
use crate::repositories::AdminRepository;
use crate::services::{AuthService, TokenType};

pub async fn admin_middleware(
    State(pool): State<PgPool>,
    State(settings): State<Settings>,
    mut request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AppError::Unauthorized)?;

    let claims = AuthService::verify_token(token, &settings.jwt.secret)?;

    if claims.token_type != TokenType::Access {
        return Err(AppError::Unauthorized);
    }

    let is_admin = AdminRepository::check_is_admin(&pool, claims.sub).await?;
    if !is_admin {
        return Err(AppError::Forbidden);
    }

    let auth_user = AuthUser {
        user_id: claims.sub,
        email: claims.email,
    };

    request.extensions_mut().insert(auth_user);

    Ok(next.run(request).await)
}
