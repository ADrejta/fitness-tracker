use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "record_type", rename_all = "kebab-case")]
#[serde(rename_all = "kebab-case")]
pub enum RecordType {
    MaxWeight,
    MaxReps,
    MaxVolume,
    #[sqlx(rename = "estimated-1rm")]
    #[serde(rename = "estimated-1rm")]
    Estimated1rm,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PersonalRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub exercise_template_id: String,
    pub exercise_name: String,
    #[sqlx(rename = "record_type")]
    pub type_: RecordType,
    pub value: f64,
    pub reps: Option<i32>,
    pub achieved_at: DateTime<Utc>,
    pub workout_id: Uuid,
}
