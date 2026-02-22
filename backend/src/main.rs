use std::net::SocketAddr;
use std::time::Duration;

use fitness_tracker_api::config::Settings;
use fitness_tracker_api::db::create_pool;
use fitness_tracker_api::routes::create_router;
use fitness_tracker_api::services::{pr_worker, PrJob};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load .env file
    dotenvy::dotenv().ok();

    // Initialize tracing — LOG_FORMAT=json enables structured JSON output for log aggregators
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "fitness_tracker_api=info,tower_http=info".into());
    if std::env::var("LOG_FORMAT").as_deref() == Ok("json") {
        tracing_subscriber::registry()
            .with(filter)
            .with(tracing_subscriber::fmt::layer().json())
            .init();
    } else {
        tracing_subscriber::registry()
            .with(filter)
            .with(tracing_subscriber::fmt::layer())
            .init();
    }

    // Load configuration
    let settings = Settings::new()?;
    tracing::info!("Configuration loaded");

    // Create database pool
    let pool = create_pool(&settings).await?;
    tracing::info!("Database connection established");

    // Run migrations
    sqlx::migrate!("./migrations").run(&pool).await?;
    tracing::info!("Migrations applied");

    // Spawn background PR detection worker
    let (pr_tx, pr_rx) = tokio::sync::mpsc::channel::<PrJob>(256);
    tokio::spawn(pr_worker(pr_rx));

    // Spawn DB pool metrics poller (every 15s)
    let pool_metrics = pool.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(15));
        loop {
            interval.tick().await;
            metrics::gauge!("db_pool_connections_total").set(pool_metrics.size() as f64);
            metrics::gauge!("db_pool_connections_idle").set(pool_metrics.num_idle() as f64);
        }
    });

    // Create router
    let app = create_router(pool.clone(), settings.clone(), pr_tx);

    // Start server
    let addr = SocketAddr::new(
        settings.server.host.parse()?,
        settings.server.port,
    );
    tracing::info!("Server starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    pool.close().await;
    tracing::info!("Server shut down cleanly.");

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c().await.unwrap();
    };

    #[cfg(unix)]
    let sigterm = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .unwrap()
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let sigterm = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = sigterm => {},
    }

    tracing::info!("Shutdown signal received, draining in-flight requests...");
}
