use axum::{
    extract::{Request, State},
    http::header::AUTHORIZATION,
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

use crate::config::Settings;
use crate::error::AppError;
use crate::services::{AuthService, TokenType};

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub email: String,
}

pub async fn auth_middleware(
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

    let auth_user = AuthUser {
        user_id: claims.sub,
        email: claims.email,
    };

    request.extensions_mut().insert(auth_user);

    Ok(next.run(request).await)
}
