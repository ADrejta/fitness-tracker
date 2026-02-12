use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::models::WorkoutStatus;

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkoutRequest {
    #[validate(length(min = 1, message = "Name is required"))]
    pub name: String,
    pub template_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkoutRequest {
    pub name: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutResponse {
    pub id: Uuid,
    pub name: String,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub exercises: Vec<WorkoutExerciseResponse>,
    pub total_volume: f64,
    pub total_sets: i32,
    pub total_reps: i32,
    pub duration: Option<i32>,
    pub status: WorkoutStatus,
    pub template_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutExerciseResponse {
    pub id: Uuid,
    pub exercise_template_id: String,
    pub exercise_name: String,
    pub sets: Vec<WorkoutSetResponse>,
    pub notes: Option<String>,
    pub superset_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutSetResponse {
    pub id: Uuid,
    pub set_number: i32,
    pub target_reps: Option<i32>,
    pub actual_reps: Option<i32>,
    pub target_weight: Option<f64>,
    pub actual_weight: Option<f64>,
    pub is_warmup: bool,
    pub is_completed: bool,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkoutExerciseRequest {
    #[validate(length(min = 1, message = "Exercise template ID is required"))]
    pub exercise_template_id: String,
    #[validate(length(min = 1, message = "Exercise name is required"))]
    pub exercise_name: String,
    pub notes: Option<String>,
    pub superset_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkoutExerciseRequest {
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateSetRequest {
    pub target_reps: Option<i32>,
    pub target_weight: Option<f64>,
    #[serde(default)]
    pub is_warmup: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSetRequest {
    pub target_reps: Option<i32>,
    pub actual_reps: Option<i32>,
    pub target_weight: Option<f64>,
    pub actual_weight: Option<f64>,
    pub is_warmup: Option<bool>,
    pub is_completed: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutListResponse {
    pub workouts: Vec<WorkoutSummaryResponse>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutSummaryResponse {
    pub id: Uuid,
    pub name: String,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub total_volume: f64,
    pub total_sets: i32,
    pub total_reps: i32,
    pub duration: Option<i32>,
    pub status: WorkoutStatus,
    pub exercise_count: i32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutQuery {
    pub status: Option<WorkoutStatus>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateSupersetRequest {
    #[validate(length(min = 2, message = "At least 2 exercise IDs are required"))]
    pub exercise_ids: Vec<Uuid>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SupersetResponse {
    pub superset_id: Uuid,
    pub exercise_ids: Vec<Uuid>,
}
