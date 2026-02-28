use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type, ToSchema)]
#[sqlx(type_name = "muscle_group", rename_all = "kebab-case")]
#[serde(rename_all = "kebab-case")]
pub enum MuscleGroup {
    Chest,
    Back,
    Shoulders,
    Biceps,
    Triceps,
    Forearms,
    Abs,
    Obliques,
    Quads,
    Hamstrings,
    Glutes,
    Calves,
    Traps,
    Lats,
    LowerBack,
    Adductors,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type, ToSchema)]
#[sqlx(type_name = "exercise_category", rename_all = "kebab-case")]
#[serde(rename_all = "kebab-case")]
pub enum ExerciseCategory {
    Strength,
    Cardio,
    Bodyweight,
    Carry,
    Timed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type, ToSchema)]
#[sqlx(type_name = "equipment", rename_all = "kebab-case")]
#[serde(rename_all = "kebab-case")]
pub enum Equipment {
    Barbell,
    Dumbbell,
    Cable,
    Machine,
    Kettlebell,
    Bodyweight,
    ResistanceBand,
    EzBar,
    SmithMachine,
    PullUpBar,
    DipStation,
    Bench,
    CardioMachine,
    TrapBar,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseTemplate {
    pub id: String,
    pub name: String,
    #[sqlx(skip)]
    pub muscle_groups: Vec<MuscleGroup>,
    pub category: ExerciseCategory,
    #[sqlx(skip)]
    pub equipment: Vec<Equipment>,
    pub is_custom: bool,
    pub description: Option<String>,
    #[sqlx(skip)]
    pub instructions: Option<Vec<String>>,
    pub user_id: Option<Uuid>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== MuscleGroup Tests ====================

    #[test]
    fn test_muscle_group_serialization_kebab_case() {
        assert_eq!(serde_json::to_string(&MuscleGroup::Chest).unwrap(), "\"chest\"");
        assert_eq!(serde_json::to_string(&MuscleGroup::LowerBack).unwrap(), "\"lower-back\"");
        assert_eq!(serde_json::to_string(&MuscleGroup::Quads).unwrap(), "\"quads\"");
    }

    #[test]
    fn test_muscle_group_deserialization() {
        let chest: MuscleGroup = serde_json::from_str("\"chest\"").unwrap();
        let lower_back: MuscleGroup = serde_json::from_str("\"lower-back\"").unwrap();
        let biceps: MuscleGroup = serde_json::from_str("\"biceps\"").unwrap();

        assert_eq!(chest, MuscleGroup::Chest);
        assert_eq!(lower_back, MuscleGroup::LowerBack);
        assert_eq!(biceps, MuscleGroup::Biceps);
    }

    #[test]
    fn test_all_muscle_groups_serialize() {
        let all_groups = vec![
            MuscleGroup::Chest,
            MuscleGroup::Back,
            MuscleGroup::Shoulders,
            MuscleGroup::Biceps,
            MuscleGroup::Triceps,
            MuscleGroup::Forearms,
            MuscleGroup::Abs,
            MuscleGroup::Obliques,
            MuscleGroup::Quads,
            MuscleGroup::Hamstrings,
            MuscleGroup::Glutes,
            MuscleGroup::Calves,
            MuscleGroup::Traps,
            MuscleGroup::Lats,
            MuscleGroup::LowerBack,
            MuscleGroup::Adductors,
        ];

        for group in all_groups {
            let json = serde_json::to_string(&group);
            assert!(json.is_ok(), "Failed to serialize {:?}", group);

            let deserialized: MuscleGroup = serde_json::from_str(&json.unwrap()).unwrap();
            assert_eq!(deserialized, group);
        }
    }

    // ==================== ExerciseCategory Tests ====================

    #[test]
    fn test_exercise_category_serialization() {
        assert_eq!(serde_json::to_string(&ExerciseCategory::Strength).unwrap(), "\"strength\"");
        assert_eq!(serde_json::to_string(&ExerciseCategory::Cardio).unwrap(), "\"cardio\"");
        assert_eq!(serde_json::to_string(&ExerciseCategory::Bodyweight).unwrap(), "\"bodyweight\"");
        assert_eq!(serde_json::to_string(&ExerciseCategory::Carry).unwrap(), "\"carry\"");
        assert_eq!(serde_json::to_string(&ExerciseCategory::Timed).unwrap(), "\"timed\"");
    }

    #[test]
    fn test_exercise_category_deserialization() {
        let strength: ExerciseCategory = serde_json::from_str("\"strength\"").unwrap();
        let cardio: ExerciseCategory = serde_json::from_str("\"cardio\"").unwrap();

        assert_eq!(strength, ExerciseCategory::Strength);
        assert_eq!(cardio, ExerciseCategory::Cardio);
    }

    // ==================== Equipment Tests ====================

    #[test]
    fn test_equipment_serialization() {
        assert_eq!(serde_json::to_string(&Equipment::Barbell).unwrap(), "\"barbell\"");
        assert_eq!(serde_json::to_string(&Equipment::SmithMachine).unwrap(), "\"smith-machine\"");
        assert_eq!(serde_json::to_string(&Equipment::PullUpBar).unwrap(), "\"pull-up-bar\"");
    }

    #[test]
    fn test_equipment_deserialization() {
        let barbell: Equipment = serde_json::from_str("\"barbell\"").unwrap();
        let dumbbell: Equipment = serde_json::from_str("\"dumbbell\"").unwrap();
        let cable: Equipment = serde_json::from_str("\"cable\"").unwrap();

        assert_eq!(barbell, Equipment::Barbell);
        assert_eq!(dumbbell, Equipment::Dumbbell);
        assert_eq!(cable, Equipment::Cable);
    }

    #[test]
    fn test_all_equipment_serialize() {
        let all_equipment = vec![
            Equipment::Barbell,
            Equipment::Dumbbell,
            Equipment::Cable,
            Equipment::Machine,
            Equipment::Kettlebell,
            Equipment::Bodyweight,
            Equipment::ResistanceBand,
            Equipment::EzBar,
            Equipment::SmithMachine,
            Equipment::PullUpBar,
            Equipment::DipStation,
            Equipment::Bench,
            Equipment::CardioMachine,
            Equipment::TrapBar,
        ];

        for eq in all_equipment {
            let json = serde_json::to_string(&eq);
            assert!(json.is_ok(), "Failed to serialize {:?}", eq);

            let deserialized: Equipment = serde_json::from_str(&json.unwrap()).unwrap();
            assert_eq!(deserialized, eq);
        }
    }

    // ==================== ExerciseTemplate Tests ====================

    #[test]
    fn test_exercise_template_serialization() {
        let template = ExerciseTemplate {
            id: "bench-press".to_string(),
            name: "Bench Press".to_string(),
            muscle_groups: vec![MuscleGroup::Chest, MuscleGroup::Triceps],
            category: ExerciseCategory::Strength,
            equipment: vec![Equipment::Barbell, Equipment::Bench],
            is_custom: false,
            description: Some("Classic chest exercise".to_string()),
            instructions: Some(vec!["Lie on bench".to_string(), "Press up".to_string()]),
            user_id: None,
        };

        let json = serde_json::to_string(&template).unwrap();

        // Check that camelCase is used
        assert!(json.contains("\"muscleGroups\""));
        assert!(json.contains("\"isCustom\""));
        assert!(json.contains("\"userId\""));
    }

    #[test]
    fn test_exercise_template_deserialization() {
        let json = r#"{
            "id": "squat",
            "name": "Barbell Squat",
            "muscleGroups": ["quads", "glutes", "hamstrings"],
            "category": "strength",
            "equipment": ["barbell"],
            "isCustom": false,
            "description": null,
            "instructions": null,
            "userId": null
        }"#;

        let template: ExerciseTemplate = serde_json::from_str(json).unwrap();

        assert_eq!(template.id, "squat");
        assert_eq!(template.name, "Barbell Squat");
        assert_eq!(template.muscle_groups.len(), 3);
        assert!(template.muscle_groups.contains(&MuscleGroup::Quads));
        assert_eq!(template.category, ExerciseCategory::Strength);
        assert!(!template.is_custom);
    }
}
