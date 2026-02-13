use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PlateConfig {
    pub weight: f64,
    pub available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum BarbellType {
    Olympic,
    Womens,
    EzBar,
    TrapBar,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PlateCalculatorSettings {
    pub selected_barbell: BarbellType,
    pub custom_barbell_weight_kg: f64,
    pub custom_barbell_weight_lbs: f64,
    pub available_plates_kg: Vec<PlateConfig>,
    pub available_plates_lbs: Vec<PlateConfig>,
}

impl Default for PlateCalculatorSettings {
    fn default() -> Self {
        Self {
            selected_barbell: BarbellType::Olympic,
            custom_barbell_weight_kg: 20.0,
            custom_barbell_weight_lbs: 45.0,
            available_plates_kg: vec![
                PlateConfig { weight: 25.0, available: true },
                PlateConfig { weight: 20.0, available: true },
                PlateConfig { weight: 15.0, available: true },
                PlateConfig { weight: 10.0, available: true },
                PlateConfig { weight: 5.0, available: true },
                PlateConfig { weight: 2.5, available: true },
                PlateConfig { weight: 1.25, available: true },
            ],
            available_plates_lbs: vec![
                PlateConfig { weight: 45.0, available: true },
                PlateConfig { weight: 35.0, available: true },
                PlateConfig { weight: 25.0, available: true },
                PlateConfig { weight: 10.0, available: true },
                PlateConfig { weight: 5.0, available: true },
                PlateConfig { weight: 2.5, available: true },
            ],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type, ToSchema)]
#[sqlx(type_name = "weight_unit", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum WeightUnit {
    Kg,
    Lbs,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type, ToSchema)]
#[sqlx(type_name = "measurement_unit", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum MeasurementUnit {
    Cm,
    In,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type, ToSchema)]
#[sqlx(type_name = "theme", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct UserSettings {
    pub user_id: Uuid,
    pub weight_unit: WeightUnit,
    pub measurement_unit: MeasurementUnit,
    pub theme: Theme,
    pub default_rest_timer: i32,
    pub auto_start_rest_timer: bool,
    pub show_warmup_sets: bool,
    pub vibrate_on_timer_end: bool,
    pub sound_on_timer_end: bool,
    #[sqlx(json)]
    pub plate_calculator: PlateCalculatorSettings,
}

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            user_id: Uuid::nil(),
            weight_unit: WeightUnit::Kg,
            measurement_unit: MeasurementUnit::Cm,
            theme: Theme::System,
            default_rest_timer: 90,
            auto_start_rest_timer: true,
            show_warmup_sets: true,
            vibrate_on_timer_end: true,
            sound_on_timer_end: true,
            plate_calculator: PlateCalculatorSettings::default(),
        }
    }
}
