use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

use crate::config::Settings;

pub async fn create_pool(settings: &Settings) -> Result<PgPool, sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_connections(settings.database.max_connections.unwrap_or(5))
        .connect(&settings.database.url)
        .await?;

    Ok(pool)
}
