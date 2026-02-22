mod common;

use common::{body_json, TestApp};

#[tokio::test]
async fn test_register_success() {
    let app = TestApp::new().await;
    let resp = app
        .post(
            "/api/v1/auth/register",
            serde_json::json!({ "email": "alice@example.com", "password": "secret1234" }),
        )
        .await;

    assert_eq!(resp.status(), 200);
    let body = body_json(resp).await;
    assert_eq!(body["user"]["email"], "alice@example.com");
    assert!(body["accessToken"].is_string());
    assert!(body["refreshToken"].is_string());
}

#[tokio::test]
async fn test_register_duplicate_email() {
    let app = TestApp::new().await;
    let payload = serde_json::json!({ "email": "bob@example.com", "password": "secret1234" });

    app.post("/api/v1/auth/register", payload.clone()).await;
    let resp = app.post("/api/v1/auth/register", payload).await;

    assert_eq!(resp.status(), 409);
    let body = body_json(resp).await;
    assert_eq!(body["status"], 409);
}

#[tokio::test]
async fn test_login_success() {
    let app = TestApp::new().await;
    app.post(
        "/api/v1/auth/register",
        serde_json::json!({ "email": "carol@example.com", "password": "secret1234" }),
    )
    .await;

    let resp = app
        .post(
            "/api/v1/auth/login",
            serde_json::json!({ "email": "carol@example.com", "password": "secret1234" }),
        )
        .await;

    assert_eq!(resp.status(), 200);
    let body = body_json(resp).await;
    assert!(body["accessToken"].is_string());
}

#[tokio::test]
async fn test_login_wrong_password() {
    let app = TestApp::new().await;
    app.post(
        "/api/v1/auth/register",
        serde_json::json!({ "email": "dave@example.com", "password": "secret1234" }),
    )
    .await;

    let resp = app
        .post(
            "/api/v1/auth/login",
            serde_json::json!({ "email": "dave@example.com", "password": "wrongpassword" }),
        )
        .await;

    assert_eq!(resp.status(), 401);
}

#[tokio::test]
async fn test_me_authenticated() {
    let app = TestApp::new().await;
    let token = common::register_and_login(&app, "eve@example.com", "secret1234").await;

    let resp = app.get_auth("/api/v1/auth/me", &token).await;

    assert_eq!(resp.status(), 200);
    let body = body_json(resp).await;
    assert_eq!(body["email"], "eve@example.com");
}

#[tokio::test]
async fn test_me_unauthenticated() {
    let app = TestApp::new().await;
    let resp = app.get("/api/v1/auth/me").await;
    assert_eq!(resp.status(), 401);
}
