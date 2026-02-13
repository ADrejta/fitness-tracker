use std::time::Duration;

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

use crate::config::Settings;

pub async fn create_pool(settings: &Settings) -> Result<PgPool, sqlx::Error> {
    let db = &settings.database;

    let pool = PgPoolOptions::new()
        .min_connections(db.min_connections.unwrap_or(1))
        .max_connections(db.max_connections.unwrap_or(10))
        .acquire_timeout(Duration::from_secs(db.acquire_timeout_secs.unwrap_or(30)))
        .idle_timeout(Duration::from_secs(db.idle_timeout_secs.unwrap_or(600)))
        .max_lifetime(Duration::from_secs(db.max_lifetime_secs.unwrap_or(1800)))
        .connect(&db.url)
        .await?;

    Ok(pool)
}
