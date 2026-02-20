use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;
use validator::Validate;

use crate::models::WorkoutStatus;

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkoutRequest {
    #[validate(length(min = 1, max = 200, message = "Name must be between 1 and 200 characters"))]
    pub name: String,
    pub template_id: Option<Uuid>,
    #[validate(length(max = 2000))]
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkoutRequest {
    #[validate(length(max = 200))]
    pub name: Option<String>,
    #[validate(length(max = 2000))]
    pub notes: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize, ToSchema)]
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
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutExerciseResponse {
    pub id: Uuid,
    pub exercise_template_id: String,
    pub exercise_name: String,
    pub sets: Vec<WorkoutSetResponse>,
    pub notes: Option<String>,
    pub superset_id: Option<Uuid>,
}

#[derive(Debug, Serialize, ToSchema)]
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
    pub rpe: Option<i16>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkoutExerciseRequest {
    #[validate(length(min = 1, max = 200, message = "Exercise template ID is required"))]
    pub exercise_template_id: String,
    #[validate(length(min = 1, max = 200))]
    pub exercise_name: Option<String>,
    #[validate(length(max = 2000))]
    pub notes: Option<String>,
    pub superset_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkoutExerciseRequest {
    #[validate(length(max = 2000))]
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateSetRequest {
    #[validate(range(min = 0, max = 9999))]
    pub target_reps: Option<i32>,
    #[validate(range(min = 0.0, max = 9999.0))]
    pub target_weight: Option<f64>,
    #[serde(default)]
    pub is_warmup: bool,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSetRequest {
    #[validate(range(min = 0, max = 9999))]
    pub target_reps: Option<i32>,
    #[validate(range(min = 0, max = 9999))]
    pub actual_reps: Option<i32>,
    #[validate(range(min = 0.0, max = 9999.0))]
    pub target_weight: Option<f64>,
    #[validate(range(min = 0.0, max = 9999.0))]
    pub actual_weight: Option<f64>,
    pub is_warmup: Option<bool>,
    pub is_completed: Option<bool>,
    #[validate(range(min = 1, max = 10))]
    pub rpe: Option<i16>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutListResponse {
    pub workouts: Vec<WorkoutSummaryResponse>,
    pub total: i64,
}

#[derive(Debug, Serialize, ToSchema)]
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
    pub tags: Vec<String>,
}

#[derive(Debug, Deserialize, Validate, IntoParams)]
#[serde(rename_all = "camelCase")]
#[into_params(rename_all = "camelCase")]
pub struct WorkoutQuery {
    pub status: Option<WorkoutStatus>,
    #[validate(range(min = 1, max = 100))]
    pub limit: Option<i64>,
    #[validate(range(min = 0))]
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateSupersetRequest {
    #[validate(length(min = 2, message = "At least 2 exercise IDs are required"))]
    pub exercise_ids: Vec<Uuid>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SupersetResponse {
    pub superset_id: Uuid,
    pub exercise_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseOrderUpdate {
    pub id: Uuid,
    pub order_index: i32,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct ReorderExercisesRequest {
    pub exercises: Vec<ExerciseOrderUpdate>,
}
