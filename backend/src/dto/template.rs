use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutTemplateResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub exercises: Vec<TemplateExerciseResponse>,
    pub estimated_duration: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
    pub usage_count: i32,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateExerciseResponse {
    pub id: Uuid,
    pub exercise_template_id: String,
    pub exercise_name: String,
    pub sets: Vec<TemplateSetResponse>,
    pub notes: Option<String>,
    pub rest_seconds: Option<i32>,
    pub superset_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateSetResponse {
    pub set_number: i32,
    pub target_reps: i32,
    pub target_weight: Option<f64>,
    pub is_warmup: bool,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateTemplateRequest {
    #[validate(length(min = 1, message = "Name is required"))]
    pub name: String,
    pub description: Option<String>,
    pub exercises: Vec<CreateTemplateExerciseRequest>,
    pub estimated_duration: Option<i32>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateTemplateExerciseRequest {
    #[validate(length(min = 1, message = "Exercise template ID is required"))]
    pub exercise_template_id: String,
    #[validate(length(min = 1, message = "Exercise name is required"))]
    pub exercise_name: String,
    pub sets: Vec<CreateTemplateSetRequest>,
    pub notes: Option<String>,
    pub rest_seconds: Option<i32>,
    pub superset_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTemplateSetRequest {
    pub target_reps: i32,
    pub target_weight: Option<f64>,
    #[serde(default)]
    pub is_warmup: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTemplateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub exercises: Option<Vec<CreateTemplateExerciseRequest>>,
    pub estimated_duration: Option<i32>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateListResponse {
    pub templates: Vec<TemplateSummaryResponse>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateSummaryResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub exercise_count: i32,
    pub estimated_duration: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
    pub usage_count: i32,
    pub tags: Option<Vec<String>>,
}
