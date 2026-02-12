use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "workout_status", rename_all = "kebab-case")]
#[serde(rename_all = "kebab-case")]
pub enum WorkoutStatus {
    InProgress,
    Completed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutSet {
    pub id: Uuid,
    pub workout_exercise_id: Uuid,
    pub set_number: i32,
    pub target_reps: Option<i32>,
    pub actual_reps: Option<i32>,
    pub target_weight: Option<f64>,
    pub actual_weight: Option<f64>,
    pub is_warmup: bool,
    pub is_completed: bool,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutExercise {
    pub id: Uuid,
    pub workout_id: Uuid,
    pub exercise_template_id: String,
    pub exercise_name: String,
    pub notes: Option<String>,
    pub order_index: i32,
    pub superset_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutExerciseWithSets {
    pub id: Uuid,
    pub exercise_template_id: String,
    pub exercise_name: String,
    pub sets: Vec<WorkoutSet>,
    pub notes: Option<String>,
    pub superset_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Workout {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub total_volume: f64,
    pub total_sets: i32,
    pub total_reps: i32,
    pub duration: Option<i32>,
    pub status: WorkoutStatus,
    pub template_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutWithExercises {
    pub id: Uuid,
    pub name: String,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub exercises: Vec<WorkoutExerciseWithSets>,
    pub total_volume: f64,
    pub total_sets: i32,
    pub total_reps: i32,
    pub duration: Option<i32>,
    pub status: WorkoutStatus,
    pub template_id: Option<Uuid>,
    pub notes: Option<String>,
}
