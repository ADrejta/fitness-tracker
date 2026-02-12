use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Authentication required")]
    Unauthorized,

    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Access denied")]
    Forbidden,

    #[error("{0}")]
    NotFound(String),

    #[error("{0}")]
    BadRequest(String),

    #[error("{0}")]
    Conflict(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("JWT error: {0}")]
    Jwt(#[from] jsonwebtoken::errors::Error),

    #[error("Internal server error")]
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::InvalidCredentials => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::Forbidden => (StatusCode::FORBIDDEN, self.to_string()),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg.clone()),
            AppError::Validation(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg.clone()),
            AppError::Database(e) => {
                tracing::error!("Database error: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Database error".to_string(),
                )
            }
            AppError::Jwt(e) => {
                tracing::error!("JWT error: {:?}", e);
                (StatusCode::UNAUTHORIZED, "Invalid token".to_string())
            }
            AppError::Internal(msg) => {
                tracing::error!("Internal error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal server error".to_string(),
                )
            }
        };

        let body = Json(json!({
            "error": error_message
        }));

        (status, body).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use http_body_util::BodyExt;

    // ==================== Error Display Tests ====================

    #[test]
    fn test_unauthorized_error_display() {
        let error = AppError::Unauthorized;
        assert_eq!(error.to_string(), "Authentication required");
    }

    #[test]
    fn test_invalid_credentials_error_display() {
        let error = AppError::InvalidCredentials;
        assert_eq!(error.to_string(), "Invalid credentials");
    }

    #[test]
    fn test_forbidden_error_display() {
        let error = AppError::Forbidden;
        assert_eq!(error.to_string(), "Access denied");
    }

    #[test]
    fn test_not_found_error_display() {
        let error = AppError::NotFound("User not found".to_string());
        assert_eq!(error.to_string(), "User not found");
    }

    #[test]
    fn test_bad_request_error_display() {
        let error = AppError::BadRequest("Invalid input".to_string());
        assert_eq!(error.to_string(), "Invalid input");
    }

    #[test]
    fn test_conflict_error_display() {
        let error = AppError::Conflict("Email already exists".to_string());
        assert_eq!(error.to_string(), "Email already exists");
    }

    #[test]
    fn test_validation_error_display() {
        let error = AppError::Validation("Email is required".to_string());
        assert_eq!(error.to_string(), "Validation error: Email is required");
    }

    #[test]
    fn test_internal_error_display() {
        let error = AppError::Internal("Something went wrong".to_string());
        assert_eq!(error.to_string(), "Internal server error");
    }

    // ==================== Error Status Code Tests ====================

    #[tokio::test]
    async fn test_unauthorized_status_code() {
        let error = AppError::Unauthorized;
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_invalid_credentials_status_code() {
        let error = AppError::InvalidCredentials;
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_forbidden_status_code() {
        let error = AppError::Forbidden;
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn test_not_found_status_code() {
        let error = AppError::NotFound("Resource not found".to_string());
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_bad_request_status_code() {
        let error = AppError::BadRequest("Invalid data".to_string());
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_conflict_status_code() {
        let error = AppError::Conflict("Already exists".to_string());
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::CONFLICT);
    }

    #[tokio::test]
    async fn test_validation_status_code() {
        let error = AppError::Validation("Field required".to_string());
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    }

    #[tokio::test]
    async fn test_internal_status_code() {
        let error = AppError::Internal("Error".to_string());
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }

    // ==================== Error Response Body Tests ====================

    #[tokio::test]
    async fn test_error_response_body_format() {
        let error = AppError::NotFound("User not found".to_string());
        let response = error.into_response();

        let body = response.into_body();
        let bytes = body.collect().await.unwrap().to_bytes();
        let body_str = String::from_utf8(bytes.to_vec()).unwrap();

        let json: serde_json::Value = serde_json::from_str(&body_str).unwrap();
        assert_eq!(json["error"], "User not found");
    }

    #[tokio::test]
    async fn test_internal_error_hides_details() {
        let error = AppError::Internal("Sensitive database connection string".to_string());
        let response = error.into_response();

        let body = response.into_body();
        let bytes = body.collect().await.unwrap().to_bytes();
        let body_str = String::from_utf8(bytes.to_vec()).unwrap();

        let json: serde_json::Value = serde_json::from_str(&body_str).unwrap();
        // Should NOT expose internal details
        assert_eq!(json["error"], "Internal server error");
        assert!(!body_str.contains("Sensitive"));
    }

    // ==================== Error Debug Tests ====================

    #[test]
    fn test_error_debug_output() {
        let error = AppError::BadRequest("Test error".to_string());
        let debug_str = format!("{:?}", error);
        assert!(debug_str.contains("BadRequest"));
        assert!(debug_str.contains("Test error"));
    }
}
