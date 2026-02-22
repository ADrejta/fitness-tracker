use axum::{
    extract::{DefaultBodyLimit, FromRef},
    middleware,
    routing::{delete, get, patch, post, put},
    Router,
};
use axum_prometheus::PrometheusMetricLayer;
use sqlx::PgPool;
use axum::http::{header, Method};
use tokio::sync::mpsc;
use tower_http::compression::CompressionLayer;
use tower_http::cors::CorsLayer;
use tower_http::trace::{DefaultOnResponse, TraceLayer};
use tracing::Level;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::Settings;
use crate::handlers;
use crate::middleware::{admin_middleware, auth_middleware, auth_rate_limiter, general_rate_limiter, request_id_middleware};
use crate::openapi::ApiDoc;
use crate::services::PrJob;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub settings: Settings,
    pub pr_tx: mpsc::Sender<PrJob>,
}

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}

impl FromRef<AppState> for Settings {
    fn from_ref(state: &AppState) -> Self {
        state.settings.clone()
    }
}

pub fn create_router(pool: PgPool, settings: Settings, pr_tx: mpsc::Sender<PrJob>) -> Router {
    let state = AppState {
        pool,
        settings: settings.clone(),
        pr_tx,
    };

    // CORS configuration - use origins from settings
    let origins: Vec<header::HeaderValue> = settings
        .cors
        .allowed_origins
        .iter()
        .filter_map(|o| o.parse().ok())
        .collect();
    let cors = CorsLayer::new()
        .allow_origin(origins)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            header::CONTENT_TYPE,
            header::AUTHORIZATION,
            header::ACCEPT,
        ]);

    // Public routes (no auth required) with strict rate limiting
    let public_routes = Router::new()
        .route("/auth/register", post(handlers::register))
        .route("/auth/login", post(handlers::login))
        .route("/auth/refresh", post(handlers::refresh))
        .layer(auth_rate_limiter());

    // Protected routes (auth required)
    let protected_routes = Router::new()
        // Auth
        .route("/auth/me", get(handlers::me))
        .route("/auth/password", patch(handlers::change_password))
        // Workouts
        .route("/workouts", get(handlers::list_workouts))
        .route("/workouts", post(handlers::create_workout))
        .route("/workouts/{id}", get(handlers::get_workout))
        .route("/workouts/{id}", patch(handlers::update_workout))
        .route("/workouts/{id}", delete(handlers::delete_workout))
        .route("/workouts/{id}/complete", post(handlers::complete_workout))
        .route("/workouts/{id}/cancel", post(handlers::cancel_workout))
        .route("/workouts/{id}/restore", post(handlers::restore_workout))
        // Workout exercises
        .route(
            "/workouts/{workout_id}/exercises",
            post(handlers::add_exercise),
        )
        .route(
            "/workouts/{workout_id}/exercises/{exercise_id}",
            patch(handlers::update_exercise),
        )
        .route(
            "/workouts/{workout_id}/exercises/{exercise_id}",
            delete(handlers::delete_exercise),
        )
        // Workout sets
        .route(
            "/workouts/{workout_id}/exercises/{exercise_id}/sets",
            post(handlers::add_set),
        )
        .route(
            "/workouts/{workout_id}/exercises/{exercise_id}/sets/{set_id}",
            patch(handlers::update_set),
        )
        .route(
            "/workouts/{workout_id}/exercises/{exercise_id}/sets/{set_id}",
            delete(handlers::delete_set),
        )
        // Workout exercise reorder
        .route(
            "/workouts/{workout_id}/exercises/reorder",
            patch(handlers::reorder_exercises),
        )
        // Workout supersets
        .route(
            "/workouts/{workout_id}/superset",
            post(handlers::create_superset),
        )
        .route(
            "/workouts/{workout_id}/superset/{superset_id}",
            delete(handlers::remove_superset),
        )
        // Exercises
        .route("/exercises", get(handlers::list_exercises))
        .route("/exercises/{id}", get(handlers::get_exercise))
        .route("/exercises/custom", post(handlers::create_custom_exercise))
        .route(
            "/exercises/custom/{id}",
            put(handlers::update_custom_exercise),
        )
        .route(
            "/exercises/custom/{id}",
            delete(handlers::delete_custom_exercise),
        )
        // Templates
        .route("/templates", get(handlers::list_templates))
        .route("/templates", post(handlers::create_template))
        .route("/templates/{id}", get(handlers::get_template))
        .route("/templates/{id}", patch(handlers::update_template))
        .route("/templates/{id}", delete(handlers::delete_template))
        .route("/templates/{id}/restore", post(handlers::restore_template))
        .route(
            "/templates/{id}/start",
            post(handlers::start_workout_from_template),
        )
        // Programs
        .route("/programs", get(handlers::list_programs))
        .route("/programs", post(handlers::create_program))
        .route("/programs/active", get(handlers::get_active_program))
        .route("/programs/{id}", get(handlers::get_program))
        .route("/programs/{id}", patch(handlers::update_program))
        .route("/programs/{id}", delete(handlers::delete_program))
        .route("/programs/{id}/start", post(handlers::start_program))
        .route(
            "/programs/{program_id}/workouts/{workout_id}/start",
            post(handlers::start_program_workout),
        )
        // Body stats
        .route(
            "/body-stats/measurements",
            get(handlers::list_measurements),
        )
        .route(
            "/body-stats/measurements",
            post(handlers::create_measurement),
        )
        .route(
            "/body-stats/measurements/{id}",
            get(handlers::get_measurement),
        )
        .route(
            "/body-stats/measurements/{id}",
            patch(handlers::update_measurement),
        )
        .route(
            "/body-stats/measurements/{id}",
            delete(handlers::delete_measurement),
        )
        .route("/body-stats/goals", get(handlers::list_goals))
        .route("/body-stats/goals", post(handlers::create_goal))
        .route("/body-stats/goals/{id}", get(handlers::get_goal))
        .route("/body-stats/goals/{id}", patch(handlers::update_goal))
        .route("/body-stats/goals/{id}", delete(handlers::delete_goal))
        .route(
            "/body-stats/goals/{id}/progress",
            get(handlers::get_goal_progress),
        )
        // Statistics
        .route("/statistics/summary", get(handlers::get_summary))
        .route("/statistics/volume/weekly", get(handlers::get_weekly_volume))
        .route(
            "/statistics/muscle-groups",
            get(handlers::get_muscle_group_distribution),
        )
        .route(
            "/statistics/exercises/{exercise_id}/progress",
            get(handlers::get_exercise_progress),
        )
        .route(
            "/statistics/exercises-with-history",
            get(handlers::get_exercises_with_history),
        )
        .route(
            "/statistics/progressive-overload",
            get(handlers::get_overload_suggestions),
        )
        .route(
            "/statistics/plateau-alerts",
            get(handlers::get_plateau_alerts),
        )
        .route(
            "/statistics/muscle-heatmap",
            get(handlers::get_muscle_heatmap),
        )
        .route(
            "/statistics/consistency-heatmap",
            get(handlers::get_consistency_heatmap),
        )
        // Personal Records
        .route("/personal-records", get(handlers::get_personal_records))
        // Settings
        .route("/settings", get(handlers::get_settings))
        .route("/settings", put(handlers::update_settings))
        .layer(middleware::from_fn_with_state(
            settings.clone(),
            auth_middleware,
        ));

    // Admin routes (admin JWT check in middleware)
    let admin_routes = Router::new()
        .route("/admin/users", get(handlers::list_admin_users))
        .route("/admin/users/{id}", get(handlers::get_admin_user))
        .route("/admin/users/{id}", delete(handlers::delete_admin_user))
        .route("/admin/users/{id}", patch(handlers::set_admin_status))
        .route("/admin/metrics", get(handlers::get_admin_metrics))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            admin_middleware,
        ));

    let (prometheus_layer, metrics_handle) = PrometheusMetricLayer::pair();

    // Rate-limited API routes (swagger + /api/v1)
    let api_routes = Router::new()
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .nest("/api/v1", public_routes.merge(protected_routes).merge(admin_routes))
        .layer(general_rate_limiter());

    // Top-level router: /health and /metrics are outside the rate limiter
    Router::new()
        .route("/health", get(handlers::health))
        .route("/metrics", get(move || async move { metrics_handle.render() }))
        .merge(api_routes)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(|request: &axum::http::Request<_>| {
                    let request_id = request
                        .extensions()
                        .get::<crate::middleware::request_id::RequestId>()
                        .map(|r| r.0.clone())
                        .unwrap_or_default();
                    tracing::info_span!(
                        "request",
                        method = %request.method(),
                        uri = %request.uri(),
                        request_id = %request_id,
                    )
                })
                .on_response(DefaultOnResponse::new().level(Level::INFO)),
        )
        .layer(middleware::from_fn(request_id_middleware))
        .layer(cors)
        .layer(CompressionLayer::new())
        .layer(DefaultBodyLimit::max(1024 * 1024)) // 1 MB
        .layer(prometheus_layer)
        .with_state(state)
}
