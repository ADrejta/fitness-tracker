use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

use crate::models::{MeasurementUnit, PlateCalculatorSettings, Theme, WeightUnit};

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SettingsResponse {
    pub weight_unit: WeightUnit,
    pub measurement_unit: MeasurementUnit,
    pub theme: Theme,
    pub default_rest_timer: i32,
    pub auto_start_rest_timer: bool,
    pub show_warmup_sets: bool,
    pub vibrate_on_timer_end: bool,
    pub sound_on_timer_end: bool,
    pub plate_calculator: PlateCalculatorSettings,
    pub compact_mode: bool,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingsRequest {
    pub weight_unit: Option<WeightUnit>,
    pub measurement_unit: Option<MeasurementUnit>,
    pub theme: Option<Theme>,
    #[validate(range(min = 1, max = 600))]
    pub default_rest_timer: Option<i32>,
    pub auto_start_rest_timer: Option<bool>,
    pub show_warmup_sets: Option<bool>,
    pub vibrate_on_timer_end: Option<bool>,
    pub sound_on_timer_end: Option<bool>,
    pub plate_calculator: Option<PlateCalculatorSettings>,
    pub compact_mode: Option<bool>,
}
