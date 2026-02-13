use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;
use validator::Validate;

use crate::models::{GoalType, MeasurementType};

#[derive(Debug, Serialize, ToSchema)]
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

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateMeasurementRequest {
    pub date: NaiveDate,
    #[validate(range(min = 0.1, max = 999.0))]
    pub weight: Option<f64>,
    #[validate(range(min = 0.1, max = 100.0))]
    pub body_fat_percentage: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub chest: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub waist: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub hips: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub left_bicep: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub right_bicep: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub left_thigh: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub right_thigh: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub neck: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub shoulders: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub left_calf: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub right_calf: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub left_forearm: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub right_forearm: Option<f64>,
    #[validate(length(max = 2000))]
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMeasurementRequest {
    pub date: Option<NaiveDate>,
    #[validate(range(min = 0.1, max = 999.0))]
    pub weight: Option<f64>,
    #[validate(range(min = 0.1, max = 100.0))]
    pub body_fat_percentage: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub chest: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub waist: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub hips: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub left_bicep: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub right_bicep: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub left_thigh: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub right_thigh: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub neck: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub shoulders: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub left_calf: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub right_calf: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub left_forearm: Option<f64>,
    #[validate(range(min = 0.1, max = 500.0))]
    pub right_forearm: Option<f64>,
    #[validate(length(max = 2000))]
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
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

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateGoalRequest {
    #[serde(rename = "type")]
    pub type_: GoalType,
    pub measurement_type: Option<MeasurementType>,
    #[validate(range(min = 0.0, max = 9999.0))]
    pub target_value: f64,
    #[validate(range(min = 0.0, max = 9999.0))]
    pub start_value: f64,
    pub start_date: NaiveDate,
    pub target_date: Option<NaiveDate>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateGoalRequest {
    #[validate(range(min = 0.0, max = 9999.0))]
    pub target_value: Option<f64>,
    pub target_date: Option<NaiveDate>,
    pub is_completed: Option<bool>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MeasurementTrendResponse {
    pub measurements: Vec<BodyMeasurementResponse>,
    pub total: i64,
}

#[derive(Debug, Deserialize, Validate, IntoParams)]
#[serde(rename_all = "camelCase")]
#[into_params(rename_all = "camelCase")]
pub struct MeasurementQuery {
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    #[validate(range(min = 1, max = 100))]
    pub limit: Option<i64>,
    #[validate(range(min = 0))]
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GoalProgressResponse {
    pub goal: GoalResponse,
    pub current_value: Option<f64>,
    pub progress_percentage: f64,
}
