use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use validator::Validate;

use crate::models::{Equipment, ExerciseCategory, MuscleGroup};

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseTemplateResponse {
    pub id: String,
    pub name: String,
    pub muscle_groups: Vec<MuscleGroup>,
    pub category: ExerciseCategory,
    pub equipment: Vec<Equipment>,
    pub is_custom: bool,
    pub description: Option<String>,
    pub instructions: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateExerciseRequest {
    #[validate(length(min = 1, max = 200, message = "Name must be between 1 and 200 characters"))]
    pub name: String,
    #[validate(length(min = 1, max = 20, message = "At least one muscle group is required"))]
    pub muscle_groups: Vec<MuscleGroup>,
    pub category: ExerciseCategory,
    #[validate(length(min = 1, max = 10, message = "At least one equipment type is required"))]
    pub equipment: Vec<Equipment>,
    #[validate(length(max = 2000))]
    pub description: Option<String>,
    pub instructions: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateExerciseRequest {
    #[validate(length(max = 200))]
    pub name: Option<String>,
    pub muscle_groups: Option<Vec<MuscleGroup>>,
    pub category: Option<ExerciseCategory>,
    pub equipment: Option<Vec<Equipment>>,
    #[validate(length(max = 2000))]
    pub description: Option<String>,
    pub instructions: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase")]
#[into_params(rename_all = "camelCase")]
pub struct ExerciseQuery {
    pub search: Option<String>,
    pub muscle_group: Option<MuscleGroup>,
    pub category: Option<ExerciseCategory>,
    pub equipment: Option<Equipment>,
    pub custom_only: Option<bool>,
}
