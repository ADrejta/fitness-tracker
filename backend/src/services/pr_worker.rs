use sqlx::PgPool;
use tokio::sync::mpsc::Receiver;
use uuid::Uuid;

use crate::services::WorkoutService;

pub struct PrJob {
    pub pool: PgPool,
    pub workout_id: Uuid,
    pub user_id: Uuid,
}

pub async fn pr_worker(mut rx: Receiver<PrJob>) {
    while let Some(job) = rx.recv().await {
        if let Err(e) =
            WorkoutService::detect_personal_records(&job.pool, job.workout_id, job.user_id).await
        {
            tracing::error!(workout_id = %job.workout_id, "PR detection failed: {e}");
        }
    }
    tracing::info!("PR worker shut down.");
}
