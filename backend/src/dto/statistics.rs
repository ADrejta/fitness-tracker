use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;
use validator::Validate;

use crate::models::{MuscleGroup, RecordType};

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DashboardSummary {
    pub total_workouts: i64,
    pub workouts_this_week: i64,
    pub total_volume: f64,
    pub volume_this_week: f64,
    pub total_sets: i64,
    pub total_reps: i64,
    pub current_streak: i32,
    pub longest_streak: i32,
    pub recent_prs: Vec<PersonalRecordResponse>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PersonalRecordResponse {
    pub id: Uuid,
    pub exercise_template_id: String,
    pub exercise_name: String,
    #[serde(rename = "type")]
    pub type_: RecordType,
    pub value: f64,
    pub reps: Option<i32>,
    pub achieved_at: DateTime<Utc>,
    pub workout_id: Uuid,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct WeeklyVolumeResponse {
    pub weeks: Vec<WeekVolume>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct WeekVolume {
    pub week_start: NaiveDate,
    pub total_volume: f64,
    pub workout_count: i32,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MuscleGroupDistribution {
    pub distributions: Vec<MuscleGroupData>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MuscleGroupData {
    pub muscle_group: MuscleGroup,
    pub set_count: i64,
    pub volume: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseProgressResponse {
    pub exercise_template_id: String,
    pub exercise_name: String,
    pub history: Vec<ExerciseHistoryEntry>,
    pub personal_records: Vec<PersonalRecordResponse>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseHistoryEntry {
    pub date: DateTime<Utc>,
    pub workout_id: Uuid,
    pub sets: Vec<SetHistoryEntry>,
    pub max_weight: Option<f64>,
    pub total_volume: f64,
    pub estimated_1rm: Option<f64>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SetHistoryEntry {
    pub set_number: i32,
    pub reps: Option<i32>,
    pub weight: Option<f64>,
    pub is_warmup: bool,
}

#[derive(Debug, Deserialize, Validate, IntoParams)]
#[serde(rename_all = "camelCase")]
#[into_params(rename_all = "camelCase")]
pub struct StatisticsQuery {
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    #[validate(range(min = 1, max = 52))]
    pub weeks: Option<i32>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PersonalRecordsListResponse {
    pub records: Vec<PersonalRecordResponse>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExercisesWithHistoryResponse {
    pub exercises: Vec<ExerciseWithHistorySummary>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseWithHistorySummary {
    pub exercise_template_id: String,
    pub exercise_name: String,
    pub workout_count: i64,
}

// Progressive Overload DTOs

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum SuggestionType {
    IncreaseWeight,
    IncreaseReps,
    Maintain,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum SuggestionConfidence {
    High,
    Medium,
    Low,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseOverloadSuggestion {
    pub exercise_template_id: String,
    pub exercise_name: String,
    pub suggestion_type: SuggestionType,
    pub suggested_weight: Option<f64>,
    pub suggested_reps: Option<i32>,
    pub current_weight: f64,
    pub current_reps: i32,
    pub reason: String,
    pub confidence: SuggestionConfidence,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct OverloadSuggestionsResponse {
    pub suggestions: Vec<ExerciseOverloadSuggestion>,
}
