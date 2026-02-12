use config::{Config, ConfigError, Environment};
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct Settings {
    pub database: DatabaseSettings,
    pub jwt: JwtSettings,
    pub server: ServerSettings,
    pub cors: CorsSettings,
}

#[derive(Debug, Deserialize, Clone)]
pub struct DatabaseSettings {
    pub url: String,
    pub max_connections: Option<u32>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct JwtSettings {
    pub secret: String,
    pub access_token_expiry_hours: i64,
    pub refresh_token_expiry_days: i64,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ServerSettings {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Deserialize, Clone)]
pub struct CorsSettings {
    pub allowed_origins: Vec<String>,
}

impl Settings {
    pub fn new() -> Result<Self, ConfigError> {
        let config = Config::builder()
            .set_default("database.max_connections", 5)?
            .set_default("jwt.access_token_expiry_hours", 24)?
            .set_default("jwt.refresh_token_expiry_days", 7)?
            .set_default("server.host", "127.0.0.1")?
            .set_default("server.port", 3000)?
            .set_default("cors.allowed_origins", vec!["http://localhost:4200"])?
            .add_source(
                Environment::default()
                    .separator("__")
                    .list_separator(",")
                    .with_list_parse_key("cors.allowed_origins"),
            )
            .build()?;

        config.try_deserialize()
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self::new().expect("Failed to load settings")
    }
}
