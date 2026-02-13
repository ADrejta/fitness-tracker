use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateSet {
    pub set_number: i32,
    pub target_reps: i32,
    pub target_weight: Option<f64>,
    pub is_warmup: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct TemplateExerciseRow {
    pub id: Uuid,
    pub template_id: Uuid,
    pub exercise_template_id: String,
    pub exercise_name: String,
    pub notes: Option<String>,
    pub rest_seconds: Option<i32>,
    pub order_index: i32,
    pub superset_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateExercise {
    pub id: Uuid,
    pub exercise_template_id: String,
    pub exercise_name: String,
    pub sets: Vec<TemplateSet>,
    pub notes: Option<String>,
    pub rest_seconds: Option<i32>,
    pub superset_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutTemplate {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub estimated_duration: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
    pub usage_count: i32,
    #[sqlx(skip)]
    pub tags: Option<Vec<String>>,
}
