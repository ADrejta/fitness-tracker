use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutProgram {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub duration_weeks: i32,
    pub is_active: bool,
    pub current_week: i32,
    pub current_day: i32,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ProgramWorkout {
    pub id: Uuid,
    pub program_id: Uuid,
    pub week_number: i32,
    pub day_number: i32,
    pub name: String,
    pub template_id: Option<Uuid>,
    pub is_rest_day: bool,
    pub notes: Option<String>,
    pub completed_workout_id: Option<Uuid>,
    pub completed_at: Option<DateTime<Utc>>,
}
