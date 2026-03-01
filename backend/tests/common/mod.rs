use axum::body::Body;
use axum::Router;
use http_body_util::BodyExt;
use sqlx::PgPool;
use testcontainers::{runners::AsyncRunner, ContainerAsync};
use testcontainers_modules::postgres::Postgres;
use tower::ServiceExt;

use fitness_tracker_api::config::{
    CorsSettings, DatabaseSettings, JwtSettings, ServerSettings, Settings,
};
use fitness_tracker_api::routes::create_router;
use fitness_tracker_api::services::PrJob;
use tokio::sync::mpsc;

#[allow(dead_code)]
pub struct TestApp {
    pub router: Router,
    pub pool: PgPool,
    _container: ContainerAsync<Postgres>,
}

impl TestApp {
    pub async fn new() -> Self {
        let container = Postgres::default().start().await.unwrap();
        let port = container.get_host_port_ipv4(5432).await.unwrap();
        let db_url = format!("postgres://postgres:postgres@127.0.0.1:{}/postgres", port);

        let pool = PgPool::connect(&db_url).await.unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        let settings = Settings {
            database: DatabaseSettings {
                url: db_url,
                min_connections: Some(1),
                max_connections: Some(5),
                acquire_timeout_secs: Some(30),
                idle_timeout_secs: Some(600),
                max_lifetime_secs: Some(1800),
            },
            jwt: JwtSettings {
                secret: "test-secret-key-must-be-at-least-32-chars-long".to_string(),
                access_token_expiry_hours: 1,
                refresh_token_expiry_days: 7,
            },
            server: ServerSettings {
                host: "127.0.0.1".to_string(),
                port: 3000,
            },
            cors: CorsSettings {
                allowed_origins: vec!["http://localhost:4200".to_string()],
            },
        };

        let (pr_tx, _pr_rx) = mpsc::channel::<PrJob>(32);
        let router = create_router(pool.clone(), settings, pr_tx);

        Self {
            router,
            pool,
            _container: container,
        }
    }

    pub async fn post(&self, path: &str, body: serde_json::Value) -> axum::response::Response {
        let request = axum::http::Request::builder()
            .method("POST")
            .uri(path)
            .header("content-type", "application/json")
            .body(Body::from(body.to_string()))
            .unwrap();
        self.router.clone().oneshot(request).await.unwrap()
    }

    #[allow(dead_code)]
    pub async fn get(&self, path: &str) -> axum::response::Response {
        let request = axum::http::Request::builder()
            .method("GET")
            .uri(path)
            .body(Body::empty())
            .unwrap();
        self.router.clone().oneshot(request).await.unwrap()
    }

    pub async fn get_auth(&self, path: &str, token: &str) -> axum::response::Response {
        let request = axum::http::Request::builder()
            .method("GET")
            .uri(path)
            .header("authorization", format!("Bearer {token}"))
            .body(Body::empty())
            .unwrap();
        self.router.clone().oneshot(request).await.unwrap()
    }

    #[allow(dead_code)]
    pub async fn post_auth(
        &self,
        path: &str,
        token: &str,
        body: serde_json::Value,
    ) -> axum::response::Response {
        let request = axum::http::Request::builder()
            .method("POST")
            .uri(path)
            .header("content-type", "application/json")
            .header("authorization", format!("Bearer {token}"))
            .body(Body::from(body.to_string()))
            .unwrap();
        self.router.clone().oneshot(request).await.unwrap()
    }

    #[allow(dead_code)]
    pub async fn delete_auth(&self, path: &str, token: &str) -> axum::response::Response {
        let request = axum::http::Request::builder()
            .method("DELETE")
            .uri(path)
            .header("authorization", format!("Bearer {token}"))
            .body(Body::empty())
            .unwrap();
        self.router.clone().oneshot(request).await.unwrap()
    }
}

pub async fn body_json(response: axum::response::Response) -> serde_json::Value {
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).unwrap()
}

/// Register a user and return the access token.
pub async fn register_and_login(app: &TestApp, email: &str, password: &str) -> String {
    app.post(
        "/api/v1/auth/register",
        serde_json::json!({ "email": email, "password": password }),
    )
    .await;

    let resp = app
        .post(
            "/api/v1/auth/login",
            serde_json::json!({ "email": email, "password": password }),
        )
        .await;

    let body = body_json(resp).await;
    body["accessToken"].as_str().unwrap().to_string()
}
