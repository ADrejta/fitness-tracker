use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::config::Settings;
use crate::dto::{AuthResponse, TokenResponse, UserResponse};
use crate::error::AppError;
use crate::models::User;
use crate::repositories::UserRepository;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub email: String,
    pub exp: i64,
    pub iat: i64,
    pub token_type: TokenType,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TokenType {
    Access,
    Refresh,
}

pub struct AuthService;

impl AuthService {
    pub fn hash_password(password: &str) -> Result<String, AppError> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| AppError::Internal(format!("Password hashing failed: {}", e)))?;
        Ok(hash.to_string())
    }

    pub fn verify_password(password: &str, hash: &str) -> Result<bool, AppError> {
        let parsed_hash = PasswordHash::new(hash)
            .map_err(|e| AppError::Internal(format!("Invalid password hash: {}", e)))?;
        Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok())
    }

    pub fn generate_tokens(user: &User, settings: &Settings) -> Result<TokenResponse, AppError> {
        let access_token = Self::generate_token(
            user,
            TokenType::Access,
            Duration::hours(settings.jwt.access_token_expiry_hours),
            &settings.jwt.secret,
        )?;

        let refresh_token = Self::generate_token(
            user,
            TokenType::Refresh,
            Duration::days(settings.jwt.refresh_token_expiry_days),
            &settings.jwt.secret,
        )?;

        Ok(TokenResponse {
            access_token,
            refresh_token,
        })
    }

    fn generate_token(
        user: &User,
        token_type: TokenType,
        expiry: Duration,
        secret: &str,
    ) -> Result<String, AppError> {
        let now = Utc::now();
        let claims = Claims {
            sub: user.id,
            email: user.email.clone(),
            exp: (now + expiry).timestamp(),
            iat: now.timestamp(),
            token_type,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )?;

        Ok(token)
    }

    pub fn verify_token(token: &str, secret: &str) -> Result<Claims, AppError> {
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(secret.as_bytes()),
            &Validation::default(),
        )?;

        Ok(token_data.claims)
    }

    pub async fn register(
        pool: &PgPool,
        settings: &Settings,
        email: &str,
        password: &str,
    ) -> Result<AuthResponse, AppError> {
        // Check if user exists
        if UserRepository::find_by_email(pool, email).await?.is_some() {
            return Err(AppError::Conflict("Email already registered".to_string()));
        }

        let password_hash = Self::hash_password(password)?;
        let user = UserRepository::create(pool, email, &password_hash).await?;
        let tokens = Self::generate_tokens(&user, settings)?;

        Ok(AuthResponse {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            user: UserResponse {
                id: user.id,
                email: user.email,
                is_admin: user.is_admin,
            },
        })
    }

    pub async fn login(
        pool: &PgPool,
        settings: &Settings,
        email: &str,
        password: &str,
    ) -> Result<AuthResponse, AppError> {
        let user = UserRepository::find_by_email(pool, email)
            .await?
            .ok_or(AppError::InvalidCredentials)?;

        if !Self::verify_password(password, &user.password_hash)? {
            return Err(AppError::InvalidCredentials);
        }

        let tokens = Self::generate_tokens(&user, settings)?;

        Ok(AuthResponse {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            user: UserResponse {
                id: user.id,
                email: user.email,
                is_admin: user.is_admin,
            },
        })
    }

    pub async fn refresh(
        pool: &PgPool,
        settings: &Settings,
        refresh_token: &str,
    ) -> Result<TokenResponse, AppError> {
        let claims = Self::verify_token(refresh_token, &settings.jwt.secret)?;

        if claims.token_type != TokenType::Refresh {
            return Err(AppError::Unauthorized);
        }

        let user = UserRepository::find_by_id(pool, claims.sub)
            .await?
            .ok_or(AppError::Unauthorized)?;

        Self::generate_tokens(&user, settings)
    }

    pub async fn get_current_user(pool: &PgPool, user_id: Uuid) -> Result<UserResponse, AppError> {
        let user = UserRepository::find_by_id(pool, user_id)
            .await?
            .ok_or(AppError::Unauthorized)?;

        Ok(UserResponse {
            id: user.id,
            email: user.email,
            is_admin: user.is_admin,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_password_produces_valid_hash() {
        let password = "secure_password_123";
        let hash = AuthService::hash_password(password).unwrap();

        // Hash should not be empty
        assert!(!hash.is_empty());
        // Hash should start with argon2 identifier
        assert!(hash.starts_with("$argon2"));
        // Hash should be different from original password
        assert_ne!(hash, password);
    }

    #[test]
    fn test_hash_password_produces_different_hashes_for_same_password() {
        let password = "test_password";
        let hash1 = AuthService::hash_password(password).unwrap();
        let hash2 = AuthService::hash_password(password).unwrap();

        // Due to random salt, hashes should be different
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_verify_password_correct() {
        let password = "my_secret_password";
        let hash = AuthService::hash_password(password).unwrap();

        let is_valid = AuthService::verify_password(password, &hash).unwrap();
        assert!(is_valid);
    }

    #[test]
    fn test_verify_password_incorrect() {
        let password = "correct_password";
        let wrong_password = "wrong_password";
        let hash = AuthService::hash_password(password).unwrap();

        let is_valid = AuthService::verify_password(wrong_password, &hash).unwrap();
        assert!(!is_valid);
    }

    #[test]
    fn test_verify_password_empty_password() {
        let password = "some_password";
        let hash = AuthService::hash_password(password).unwrap();

        let is_valid = AuthService::verify_password("", &hash).unwrap();
        assert!(!is_valid);
    }

    #[test]
    fn test_verify_password_with_special_characters() {
        let password = "p@$$w0rd!#%^&*()_+-=[]{}|;':\",./<>?";
        let hash = AuthService::hash_password(password).unwrap();

        let is_valid = AuthService::verify_password(password, &hash).unwrap();
        assert!(is_valid);
    }

    #[test]
    fn test_verify_password_unicode() {
        let password = "密码パスワード🔐";
        let hash = AuthService::hash_password(password).unwrap();

        let is_valid = AuthService::verify_password(password, &hash).unwrap();
        assert!(is_valid);
    }

    #[test]
    fn test_generate_and_verify_token() {
        let user = User {
            id: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            password_hash: "hash".to_string(),
            is_admin: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let secret = "test_jwt_secret_key_that_is_long_enough";

        let token = AuthService::generate_token(
            &user,
            TokenType::Access,
            Duration::hours(1),
            secret,
        )
        .unwrap();

        let claims = AuthService::verify_token(&token, secret).unwrap();

        assert_eq!(claims.sub, user.id);
        assert_eq!(claims.email, user.email);
        assert_eq!(claims.token_type, TokenType::Access);
    }

    #[test]
    fn test_verify_token_with_wrong_secret() {
        let user = User {
            id: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            password_hash: "hash".to_string(),
            is_admin: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let secret = "correct_secret";
        let wrong_secret = "wrong_secret";

        let token = AuthService::generate_token(
            &user,
            TokenType::Access,
            Duration::hours(1),
            secret,
        )
        .unwrap();

        let result = AuthService::verify_token(&token, wrong_secret);
        assert!(result.is_err());
    }

    #[test]
    fn test_token_type_access_vs_refresh() {
        let user = User {
            id: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            password_hash: "hash".to_string(),
            is_admin: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let secret = "test_secret";

        let access_token = AuthService::generate_token(
            &user,
            TokenType::Access,
            Duration::hours(1),
            secret,
        )
        .unwrap();

        let refresh_token = AuthService::generate_token(
            &user,
            TokenType::Refresh,
            Duration::days(7),
            secret,
        )
        .unwrap();

        let access_claims = AuthService::verify_token(&access_token, secret).unwrap();
        let refresh_claims = AuthService::verify_token(&refresh_token, secret).unwrap();

        assert_eq!(access_claims.token_type, TokenType::Access);
        assert_eq!(refresh_claims.token_type, TokenType::Refresh);
    }

    #[test]
    fn test_token_expiry_is_set_correctly() {
        let user = User {
            id: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            password_hash: "hash".to_string(),
            is_admin: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let secret = "test_secret";
        let expiry_hours = 2;

        let token = AuthService::generate_token(
            &user,
            TokenType::Access,
            Duration::hours(expiry_hours),
            secret,
        )
        .unwrap();

        let claims = AuthService::verify_token(&token, secret).unwrap();
        let expected_exp = claims.iat + (expiry_hours * 3600);

        assert_eq!(claims.exp, expected_exp);
    }

    #[test]
    fn test_token_type_serialization() {
        // Test that TokenType serializes correctly for JSON
        let access = TokenType::Access;
        let refresh = TokenType::Refresh;

        let access_json = serde_json::to_string(&access).unwrap();
        let refresh_json = serde_json::to_string(&refresh).unwrap();

        assert_eq!(access_json, "\"access\"");
        assert_eq!(refresh_json, "\"refresh\"");
    }

    #[test]
    fn test_claims_serialization() {
        let claims = Claims {
            sub: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap(),
            email: "test@example.com".to_string(),
            exp: 1234567890,
            iat: 1234567800,
            token_type: TokenType::Access,
        };

        let json = serde_json::to_string(&claims).unwrap();
        let deserialized: Claims = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.sub, claims.sub);
        assert_eq!(deserialized.email, claims.email);
        assert_eq!(deserialized.exp, claims.exp);
        assert_eq!(deserialized.iat, claims.iat);
        assert_eq!(deserialized.token_type, claims.token_type);
    }
}
