mod common;

use common::{body_json, register_and_login, TestApp};

#[tokio::test]
async fn test_create_workout() {
    let app = TestApp::new().await;
    let token = register_and_login(&app, "frank@example.com", "secret1234").await;

    let resp = app
        .post_auth(
            "/api/v1/workouts",
            &token,
            serde_json::json!({ "name": "Morning Push" }),
        )
        .await;

    assert_eq!(resp.status(), 200);
    let body = body_json(resp).await;
    assert_eq!(body["name"], "Morning Push");
    assert_eq!(body["status"], "in-progress");
}

#[tokio::test]
async fn test_list_workouts() {
    let app = TestApp::new().await;
    let token = register_and_login(&app, "grace@example.com", "secret1234").await;

    app.post_auth(
        "/api/v1/workouts",
        &token,
        serde_json::json!({ "name": "Leg Day" }),
    )
    .await;

    let resp = app.get_auth("/api/v1/workouts", &token).await;

    assert_eq!(resp.status(), 200);
    let body = body_json(resp).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["workouts"][0]["name"], "Leg Day");
}

#[tokio::test]
async fn test_soft_delete_workout() {
    let app = TestApp::new().await;
    let token = register_and_login(&app, "henry@example.com", "secret1234").await;

    let create_resp = app
        .post_auth(
            "/api/v1/workouts",
            &token,
            serde_json::json!({ "name": "To Delete" }),
        )
        .await;
    let workout_id = body_json(create_resp).await["id"]
        .as_str()
        .unwrap()
        .to_string();

    // Delete (soft)
    let del_resp = app
        .delete_auth(&format!("/api/v1/workouts/{}", workout_id), &token)
        .await;
    assert_eq!(del_resp.status(), 200);

    // Workout should no longer appear in the list
    let list_resp = app.get_auth("/api/v1/workouts", &token).await;
    let list_body = body_json(list_resp).await;
    assert_eq!(list_body["total"], 0);
}

#[tokio::test]
async fn test_restore_workout() {
    let app = TestApp::new().await;
    let token = register_and_login(&app, "irene@example.com", "secret1234").await;

    let create_resp = app
        .post_auth(
            "/api/v1/workouts",
            &token,
            serde_json::json!({ "name": "Restorable" }),
        )
        .await;
    let workout_id = body_json(create_resp).await["id"]
        .as_str()
        .unwrap()
        .to_string();

    // Soft-delete
    app.delete_auth(&format!("/api/v1/workouts/{}", workout_id), &token)
        .await;

    // Restore
    let restore_resp = app
        .post_auth(
            &format!("/api/v1/workouts/{}/restore", workout_id),
            &token,
            serde_json::json!({}),
        )
        .await;
    assert_eq!(restore_resp.status(), 200);
    let body = body_json(restore_resp).await;
    assert_eq!(body["name"], "Restorable");

    // Now appears in list again
    let list_resp = app.get_auth("/api/v1/workouts", &token).await;
    let list_body = body_json(list_resp).await;
    assert_eq!(list_body["total"], 1);
}
