use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct BodyMeasurement {
    pub id: Uuid,
    pub user_id: Uuid,
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "goal_type", rename_all = "kebab-case")]
#[serde(rename_all = "camelCase")]
pub enum GoalType {
    Weight,
    BodyFat,
    Measurement,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "measurement_type", rename_all = "snake_case")]
#[serde(rename_all = "camelCase")]
pub enum MeasurementType {
    Weight,
    BodyFatPercentage,
    Chest,
    Waist,
    Hips,
    LeftBicep,
    RightBicep,
    LeftThigh,
    RightThigh,
    Neck,
    Shoulders,
    LeftCalf,
    RightCalf,
    LeftForearm,
    RightForearm,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct BodyStatsGoal {
    pub id: Uuid,
    pub user_id: Uuid,
    #[sqlx(rename = "goal_type")]
    pub type_: GoalType,
    pub measurement_type: Option<MeasurementType>,
    pub target_value: f64,
    pub start_value: f64,
    pub start_date: NaiveDate,
    pub target_date: Option<NaiveDate>,
    pub is_completed: bool,
    pub completed_at: Option<DateTime<Utc>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== GoalType Tests ====================

    #[test]
    fn test_goal_type_serialization() {
        assert_eq!(serde_json::to_string(&GoalType::Weight).unwrap(), "\"weight\"");
        assert_eq!(serde_json::to_string(&GoalType::BodyFat).unwrap(), "\"bodyFat\"");
        assert_eq!(serde_json::to_string(&GoalType::Measurement).unwrap(), "\"measurement\"");
    }

    #[test]
    fn test_goal_type_deserialization() {
        let weight: GoalType = serde_json::from_str("\"weight\"").unwrap();
        let body_fat: GoalType = serde_json::from_str("\"bodyFat\"").unwrap();

        assert_eq!(weight, GoalType::Weight);
        assert_eq!(body_fat, GoalType::BodyFat);
    }

    // ==================== MeasurementType Tests ====================

    #[test]
    fn test_measurement_type_serialization() {
        assert_eq!(serde_json::to_string(&MeasurementType::Weight).unwrap(), "\"weight\"");
        assert_eq!(serde_json::to_string(&MeasurementType::BodyFatPercentage).unwrap(), "\"bodyFatPercentage\"");
        assert_eq!(serde_json::to_string(&MeasurementType::LeftBicep).unwrap(), "\"leftBicep\"");
    }

    #[test]
    fn test_measurement_type_deserialization() {
        let weight: MeasurementType = serde_json::from_str("\"weight\"").unwrap();
        let chest: MeasurementType = serde_json::from_str("\"chest\"").unwrap();
        let waist: MeasurementType = serde_json::from_str("\"waist\"").unwrap();

        assert_eq!(weight, MeasurementType::Weight);
        assert_eq!(chest, MeasurementType::Chest);
        assert_eq!(waist, MeasurementType::Waist);
    }

    #[test]
    fn test_all_measurement_types_serialize() {
        let all_types = vec![
            MeasurementType::Weight,
            MeasurementType::BodyFatPercentage,
            MeasurementType::Chest,
            MeasurementType::Waist,
            MeasurementType::Hips,
            MeasurementType::LeftBicep,
            MeasurementType::RightBicep,
            MeasurementType::LeftThigh,
            MeasurementType::RightThigh,
            MeasurementType::Neck,
            MeasurementType::Shoulders,
            MeasurementType::LeftCalf,
            MeasurementType::RightCalf,
            MeasurementType::LeftForearm,
            MeasurementType::RightForearm,
        ];

        for measurement in all_types {
            let json = serde_json::to_string(&measurement);
            assert!(json.is_ok(), "Failed to serialize {:?}", measurement);

            let deserialized: MeasurementType = serde_json::from_str(&json.unwrap()).unwrap();
            assert_eq!(deserialized, measurement);
        }
    }

    // ==================== BodyMeasurement Tests ====================

    #[test]
    fn test_body_measurement_serialization() {
        let measurement = BodyMeasurement {
            id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            date: NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
            weight: Some(80.5),
            body_fat_percentage: Some(15.0),
            chest: Some(100.0),
            waist: Some(82.0),
            hips: Some(95.0),
            left_bicep: Some(35.0),
            right_bicep: Some(35.5),
            left_thigh: Some(55.0),
            right_thigh: Some(55.0),
            neck: None,
            shoulders: None,
            left_calf: None,
            right_calf: None,
            left_forearm: None,
            right_forearm: None,
            notes: Some("Morning measurement".to_string()),
        };

        let json = serde_json::to_string(&measurement).unwrap();

        // Check camelCase naming
        assert!(json.contains("\"bodyFatPercentage\""));
        assert!(json.contains("\"leftBicep\""));
        assert!(json.contains("\"rightBicep\""));
        assert!(json.contains("\"userId\""));
    }

    #[test]
    fn test_body_measurement_deserialization() {
        let json = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "userId": "550e8400-e29b-41d4-a716-446655440001",
            "date": "2024-01-15",
            "weight": 80.5,
            "bodyFatPercentage": 15.0,
            "chest": null,
            "waist": 82.0,
            "hips": null,
            "leftBicep": null,
            "rightBicep": null,
            "leftThigh": null,
            "rightThigh": null,
            "neck": null,
            "shoulders": null,
            "leftCalf": null,
            "rightCalf": null,
            "leftForearm": null,
            "rightForearm": null,
            "notes": null
        }"#;

        let measurement: BodyMeasurement = serde_json::from_str(json).unwrap();

        assert_eq!(measurement.weight, Some(80.5));
        assert_eq!(measurement.body_fat_percentage, Some(15.0));
        assert_eq!(measurement.waist, Some(82.0));
        assert!(measurement.chest.is_none());
    }

    // ==================== BodyStatsGoal Tests ====================

    #[test]
    fn test_body_stats_goal_serialization() {
        let goal = BodyStatsGoal {
            id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            type_: GoalType::Weight,
            measurement_type: None,
            target_value: 75.0,
            start_value: 85.0,
            start_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            target_date: Some(NaiveDate::from_ymd_opt(2024, 6, 1).unwrap()),
            is_completed: false,
            completed_at: None,
        };

        let json = serde_json::to_string(&goal).unwrap();

        assert!(json.contains("\"targetValue\""));
        assert!(json.contains("\"startValue\""));
        assert!(json.contains("\"startDate\""));
        assert!(json.contains("\"targetDate\""));
        assert!(json.contains("\"isCompleted\""));
    }

    #[test]
    fn test_body_stats_goal_progress_calculation() {
        // Test a helper that could be used to calculate goal progress
        let start_value: f64 = 85.0;
        let target_value: f64 = 75.0;
        let current_value: f64 = 80.0;

        // Calculate progress percentage (for weight loss)
        let total_change_needed = start_value - target_value; // 10kg to lose
        let change_achieved = start_value - current_value;    // 5kg lost
        let progress_percentage = (change_achieved / total_change_needed) * 100.0;

        assert!((progress_percentage - 50.0_f64).abs() < 0.01);
    }
}
