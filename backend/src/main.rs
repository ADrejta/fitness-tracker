use std::net::SocketAddr;

use fitness_tracker_api::config::Settings;
use fitness_tracker_api::db::create_pool;
use fitness_tracker_api::routes::create_router;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load .env file
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "fitness_tracker_api=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let settings = Settings::new()?;
    tracing::info!("Configuration loaded");

    // Create database pool
    let pool = create_pool(&settings).await?;
    tracing::info!("Database connection established");

    // Run migrations
    sqlx::migrate!("./migrations").run(&pool).await?;
    tracing::info!("Migrations applied");

    // Create router
    let app = create_router(pool, settings.clone());

    // Start server
    let addr = SocketAddr::new(
        settings.server.host.parse()?,
        settings.server.port,
    );
    tracing::info!("Server starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
