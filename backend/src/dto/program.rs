use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

// Request DTOs

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateProgramRequest {
    #[validate(length(min = 1, max = 200, message = "Name must be between 1 and 200 characters"))]
    pub name: String,
    #[validate(length(max = 2000))]
    pub description: Option<String>,
    #[validate(range(min = 1, max = 52, message = "Duration must be between 1 and 52 weeks"))]
    pub duration_weeks: i32,
    #[validate(nested)]
    pub workouts: Vec<CreateProgramWorkoutRequest>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateProgramWorkoutRequest {
    #[validate(range(min = 1, max = 52))]
    pub week_number: i32,
    #[validate(range(min = 1, max = 7))]
    pub day_number: i32,
    #[validate(length(min = 1, max = 200))]
    pub name: String,
    pub template_id: Option<Uuid>,
    #[serde(default)]
    pub is_rest_day: bool,
    #[validate(length(max = 2000))]
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProgramRequest {
    #[validate(length(min = 1, max = 200))]
    pub name: Option<String>,
    #[validate(length(max = 2000))]
    pub description: Option<String>,
    #[validate(range(min = 1, max = 52))]
    pub duration_weeks: Option<i32>,
    #[validate(nested)]
    pub workouts: Option<Vec<CreateProgramWorkoutRequest>>,
}

// Response DTOs

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProgramResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub duration_weeks: i32,
    pub is_active: bool,
    pub current_week: i32,
    pub current_day: i32,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub weeks: Vec<ProgramWeekResponse>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProgramWeekResponse {
    pub week_number: i32,
    pub workouts: Vec<ProgramWorkoutResponse>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProgramWorkoutResponse {
    pub id: Uuid,
    pub week_number: i32,
    pub day_number: i32,
    pub name: String,
    pub template_id: Option<Uuid>,
    pub is_rest_day: bool,
    pub notes: Option<String>,
    pub completed_workout_id: Option<Uuid>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProgramSummaryResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub duration_weeks: i32,
    pub is_active: bool,
    pub current_week: i32,
    pub current_day: i32,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub total_workouts: i32,
    pub completed_workouts: i32,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProgramListResponse {
    pub programs: Vec<ProgramSummaryResponse>,
}
