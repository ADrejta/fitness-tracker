use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct RegisterRequest {
    #[validate(email(message = "Invalid email address"), length(max = 254))]
    pub email: String,
    #[validate(length(min = 8, max = 128, message = "Password must be between 8 and 128 characters"))]
    pub password: String,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct LoginRequest {
    #[validate(email(message = "Invalid email address"), length(max = 254))]
    pub email: String,
    #[validate(length(max = 128))]
    pub password: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user: UserResponse,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== RegisterRequest Validation Tests ====================

    #[test]
    fn test_register_request_valid() {
        let request = RegisterRequest {
            email: "user@example.com".to_string(),
            password: "secure_password_123".to_string(),
        };

        assert!(request.validate().is_ok());
    }

    #[test]
    fn test_register_request_invalid_email() {
        let request = RegisterRequest {
            email: "invalid-email".to_string(),
            password: "secure_password".to_string(),
        };

        let result = request.validate();
        assert!(result.is_err());

        let errors = result.unwrap_err();
        assert!(errors.field_errors().contains_key("email"));
    }

    #[test]
    fn test_register_request_empty_email() {
        let request = RegisterRequest {
            email: "".to_string(),
            password: "secure_password".to_string(),
        };

        let result = request.validate();
        assert!(result.is_err());
    }

    #[test]
    fn test_register_request_password_too_short() {
        let request = RegisterRequest {
            email: "user@example.com".to_string(),
            password: "short".to_string(), // Only 5 characters
        };

        let result = request.validate();
        assert!(result.is_err());

        let errors = result.unwrap_err();
        assert!(errors.field_errors().contains_key("password"));
    }

    #[test]
    fn test_register_request_password_exactly_8_chars() {
        let request = RegisterRequest {
            email: "user@example.com".to_string(),
            password: "exactly8".to_string(), // Exactly 8 characters
        };

        assert!(request.validate().is_ok());
    }

    #[test]
    fn test_register_request_password_7_chars() {
        let request = RegisterRequest {
            email: "user@example.com".to_string(),
            password: "7chars!".to_string(), // Only 7 characters
        };

        let result = request.validate();
        assert!(result.is_err());
    }

    // ==================== LoginRequest Validation Tests ====================

    #[test]
    fn test_login_request_valid() {
        let request = LoginRequest {
            email: "user@example.com".to_string(),
            password: "any_password".to_string(),
        };

        assert!(request.validate().is_ok());
    }

    #[test]
    fn test_login_request_invalid_email() {
        let request = LoginRequest {
            email: "not-an-email".to_string(),
            password: "password".to_string(),
        };

        let result = request.validate();
        assert!(result.is_err());
    }

    #[test]
    fn test_login_request_accepts_any_password() {
        // Login doesn't validate password length (that's for register)
        let request = LoginRequest {
            email: "user@example.com".to_string(),
            password: "a".to_string(), // Even 1 char is fine for login attempt
        };

        assert!(request.validate().is_ok());
    }

    // ==================== Serialization Tests ====================

    #[test]
    fn test_auth_response_serialization() {
        let response = AuthResponse {
            access_token: "access_123".to_string(),
            refresh_token: "refresh_456".to_string(),
            user: UserResponse {
                id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap(),
                email: "user@example.com".to_string(),
            },
        };

        let json = serde_json::to_string(&response).unwrap();

        // Check camelCase
        assert!(json.contains("\"accessToken\""));
        assert!(json.contains("\"refreshToken\""));
        assert!(json.contains("\"user\""));
    }

    #[test]
    fn test_user_response_serialization() {
        let user = UserResponse {
            id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap(),
            email: "test@example.com".to_string(),
        };

        let json = serde_json::to_string(&user).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed["email"], "test@example.com");
        assert_eq!(parsed["id"], "550e8400-e29b-41d4-a716-446655440000");
    }

    #[test]
    fn test_token_response_serialization() {
        let response = TokenResponse {
            access_token: "new_access".to_string(),
            refresh_token: "new_refresh".to_string(),
        };

        let json = serde_json::to_string(&response).unwrap();

        assert!(json.contains("\"accessToken\""));
        assert!(json.contains("\"refreshToken\""));
    }

    // ==================== Deserialization Tests ====================

    #[test]
    fn test_register_request_deserialization() {
        let json = r#"{"email": "user@example.com", "password": "secure123"}"#;
        let request: RegisterRequest = serde_json::from_str(json).unwrap();

        assert_eq!(request.email, "user@example.com");
        assert_eq!(request.password, "secure123");
    }

    #[test]
    fn test_login_request_deserialization() {
        let json = r#"{"email": "user@example.com", "password": "mypassword"}"#;
        let request: LoginRequest = serde_json::from_str(json).unwrap();

        assert_eq!(request.email, "user@example.com");
        assert_eq!(request.password, "mypassword");
    }

    #[test]
    fn test_refresh_request_deserialization() {
        let json = r#"{"refreshToken": "my_refresh_token"}"#;
        let request: RefreshRequest = serde_json::from_str(json).unwrap();

        assert_eq!(request.refresh_token, "my_refresh_token");
    }
}
