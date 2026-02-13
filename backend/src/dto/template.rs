use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Serialize, ToSchema)]
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

#[derive(Debug, Serialize, ToSchema)]
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

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TemplateSetResponse {
    pub set_number: i32,
    pub target_reps: i32,
    pub target_weight: Option<f64>,
    pub is_warmup: bool,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateTemplateRequest {
    #[validate(length(min = 1, max = 200, message = "Name must be between 1 and 200 characters"))]
    pub name: String,
    #[validate(length(max = 2000))]
    pub description: Option<String>,
    #[validate(nested)]
    pub exercises: Vec<CreateTemplateExerciseRequest>,
    #[validate(range(min = 1, max = 1440))]
    pub estimated_duration: Option<i32>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateTemplateExerciseRequest {
    #[validate(length(min = 1, max = 200, message = "Exercise template ID is required"))]
    pub exercise_template_id: String,
    #[validate(length(min = 1, max = 200, message = "Exercise name is required"))]
    pub exercise_name: String,
    #[validate(nested)]
    pub sets: Vec<CreateTemplateSetRequest>,
    #[validate(length(max = 2000))]
    pub notes: Option<String>,
    #[validate(range(min = 0, max = 600))]
    pub rest_seconds: Option<i32>,
    pub superset_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateTemplateSetRequest {
    #[validate(range(min = 0, max = 9999))]
    pub target_reps: i32,
    #[validate(range(min = 0.0, max = 9999.0))]
    pub target_weight: Option<f64>,
    #[serde(default)]
    pub is_warmup: bool,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTemplateRequest {
    #[validate(length(max = 200))]
    pub name: Option<String>,
    #[validate(length(max = 2000))]
    pub description: Option<String>,
    #[validate(nested)]
    pub exercises: Option<Vec<CreateTemplateExerciseRequest>>,
    #[validate(range(min = 1, max = 1440))]
    pub estimated_duration: Option<i32>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TemplateListResponse {
    pub templates: Vec<TemplateSummaryResponse>,
    pub total: i64,
}

#[derive(Debug, Serialize, ToSchema)]
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
