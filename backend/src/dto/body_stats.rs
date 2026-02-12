use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::models::{GoalType, MeasurementType};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BodyMeasurementResponse {
    pub id: Uuid,
    pub date: NaiveDate,
    pub weight: Option<f64>,
    pub body_fat_percentage: Option<f64>,
    pub chest: Option<f64>,
    pub waist: Option<f64>,
    pub hips: Option<f64>,
    pub left_bicep: Option<f64>,
    pub right_bicep: Option<f64>,
    pub left_thigh: Option<f64>,
    pub right_thigh: Option<f64>,
    pub neck: Option<f64>,
    pub shoulders: Option<f64>,
    pub left_calf: Option<f64>,
    pub right_calf: Option<f64>,
    pub left_forearm: Option<f64>,
    pub right_forearm: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateMeasurementRequest {
    pub date: NaiveDate,
    pub weight: Option<f64>,
    pub body_fat_percentage: Option<f64>,
    pub chest: Option<f64>,
    pub waist: Option<f64>,
    pub hips: Option<f64>,
    pub left_bicep: Option<f64>,
    pub right_bicep: Option<f64>,
    pub left_thigh: Option<f64>,
    pub right_thigh: Option<f64>,
    pub neck: Option<f64>,
    pub shoulders: Option<f64>,
    pub left_calf: Option<f64>,
    pub right_calf: Option<f64>,
    pub left_forearm: Option<f64>,
    pub right_forearm: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMeasurementRequest {
    pub date: Option<NaiveDate>,
    pub weight: Option<f64>,
    pub body_fat_percentage: Option<f64>,
    pub chest: Option<f64>,
    pub waist: Option<f64>,
    pub hips: Option<f64>,
    pub left_bicep: Option<f64>,
    pub right_bicep: Option<f64>,
    pub left_thigh: Option<f64>,
    pub right_thigh: Option<f64>,
    pub neck: Option<f64>,
    pub shoulders: Option<f64>,
    pub left_calf: Option<f64>,
    pub right_calf: Option<f64>,
    pub left_forearm: Option<f64>,
    pub right_forearm: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalResponse {
    pub id: Uuid,
    #[serde(rename = "type")]
    pub type_: GoalType,
    pub measurement_type: Option<MeasurementType>,
    pub target_value: f64,
    pub start_value: f64,
    pub start_date: NaiveDate,
    pub target_date: Option<NaiveDate>,
    pub is_completed: bool,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateGoalRequest {
    #[serde(rename = "type")]
    pub type_: GoalType,
    pub measurement_type: Option<MeasurementType>,
    pub target_value: f64,
    pub start_value: f64,
    pub start_date: NaiveDate,
    pub target_date: Option<NaiveDate>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateGoalRequest {
    pub target_value: Option<f64>,
    pub target_date: Option<NaiveDate>,
    pub is_completed: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MeasurementTrendResponse {
    pub measurements: Vec<BodyMeasurementResponse>,
    pub total: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MeasurementQuery {
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalProgressResponse {
    pub goal: GoalResponse,
    pub current_value: Option<f64>,
    pub progress_percentage: f64,
}
