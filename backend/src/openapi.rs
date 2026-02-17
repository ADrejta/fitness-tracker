use utoipa::openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme};
use utoipa::{Modify, OpenApi};

use crate::dto::*;
use crate::handlers;
use crate::models::{
    BarbellType, Equipment, ExerciseCategory, GoalType, MeasurementType, MeasurementUnit,
    MuscleGroup, PlateCalculatorSettings, PlateConfig, RecordType, Theme, WeightUnit,
    WorkoutStatus,
};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Fitness Tracker API",
        version = "1.0.0",
        description = "REST API for tracking workouts, exercises, body stats, and personal records."
    ),
    paths(
        // Auth
        handlers::register,
        handlers::login,
        handlers::refresh,
        handlers::me,
        // Workouts
        handlers::create_workout,
        handlers::list_workouts,
        handlers::get_workout,
        handlers::update_workout,
        handlers::delete_workout,
        handlers::complete_workout,
        handlers::cancel_workout,
        // Workout exercises
        handlers::add_exercise,
        handlers::update_exercise,
        handlers::delete_exercise,
        // Workout sets
        handlers::add_set,
        handlers::update_set,
        handlers::delete_set,
        // Workout supersets
        handlers::create_superset,
        handlers::remove_superset,
        // Exercises
        handlers::list_exercises,
        handlers::get_exercise,
        handlers::create_custom_exercise,
        handlers::update_custom_exercise,
        handlers::delete_custom_exercise,
        // Templates
        handlers::list_templates,
        handlers::get_template,
        handlers::create_template,
        handlers::update_template,
        handlers::delete_template,
        handlers::start_workout_from_template,
        // Programs
        handlers::create_program,
        handlers::list_programs,
        handlers::get_program,
        handlers::update_program,
        handlers::delete_program,
        handlers::start_program,
        handlers::start_program_workout,
        handlers::get_active_program,
        // Body stats
        handlers::create_measurement,
        handlers::list_measurements,
        handlers::get_measurement,
        handlers::update_measurement,
        handlers::delete_measurement,
        handlers::create_goal,
        handlers::list_goals,
        handlers::get_goal,
        handlers::update_goal,
        handlers::delete_goal,
        handlers::get_goal_progress,
        // Statistics
        handlers::get_summary,
        handlers::get_weekly_volume,
        handlers::get_muscle_group_distribution,
        handlers::get_exercise_progress,
        handlers::get_exercises_with_history,
        handlers::get_overload_suggestions,
        handlers::get_plateau_alerts,
        // Personal records
        handlers::get_personal_records,
        // Settings
        handlers::get_settings,
        handlers::update_settings,
    ),
    components(
        schemas(
            // Error
            ErrorResponse,
            // Auth
            RegisterRequest, LoginRequest, AuthResponse, UserResponse, RefreshRequest, TokenResponse,
            // Workout
            CreateWorkoutRequest, UpdateWorkoutRequest, WorkoutResponse, WorkoutExerciseResponse,
            WorkoutSetResponse, CreateWorkoutExerciseRequest, UpdateWorkoutExerciseRequest,
            CreateSetRequest, UpdateSetRequest, WorkoutListResponse, WorkoutSummaryResponse,
            CreateSupersetRequest, SupersetResponse,
            // Exercise
            ExerciseTemplateResponse, CreateExerciseRequest, UpdateExerciseRequest,
            // Template
            WorkoutTemplateResponse, TemplateExerciseResponse, TemplateSetResponse,
            CreateTemplateRequest, CreateTemplateExerciseRequest, CreateTemplateSetRequest,
            UpdateTemplateRequest, TemplateListResponse, TemplateSummaryResponse,
            // Programs
            CreateProgramRequest, CreateProgramWorkoutRequest, UpdateProgramRequest,
            ProgramResponse, ProgramWeekResponse, ProgramWorkoutResponse,
            ProgramSummaryResponse, ProgramListResponse,
            // Body stats
            BodyMeasurementResponse, CreateMeasurementRequest, UpdateMeasurementRequest,
            GoalResponse, CreateGoalRequest, UpdateGoalRequest, MeasurementTrendResponse,
            GoalProgressResponse,
            // Statistics
            DashboardSummary, PersonalRecordResponse, WeeklyVolumeResponse, WeekVolume,
            MuscleGroupDistribution, MuscleGroupData, ExerciseProgressResponse,
            ExerciseHistoryEntry, SetHistoryEntry, PersonalRecordsListResponse,
            ExercisesWithHistoryResponse, ExerciseWithHistorySummary,
            OverloadSuggestionsResponse, ExerciseOverloadSuggestion, SuggestionType, SuggestionConfidence,
            PlateauAlertResponse, ExercisePlateauAlert,
            // Settings
            SettingsResponse, UpdateSettingsRequest,
            // Model enums
            MuscleGroup, ExerciseCategory, Equipment, WorkoutStatus, GoalType,
            MeasurementType, RecordType, WeightUnit, MeasurementUnit, Theme,
            BarbellType, PlateConfig, PlateCalculatorSettings,
        )
    ),
    modifiers(&SecurityAddon),
    tags(
        (name = "Auth", description = "Authentication endpoints"),
        (name = "Workouts", description = "Workout management"),
        (name = "Workout Exercises", description = "Exercises within a workout"),
        (name = "Workout Sets", description = "Sets within a workout exercise"),
        (name = "Workout Supersets", description = "Superset grouping of exercises"),
        (name = "Exercises", description = "Exercise template library"),
        (name = "Templates", description = "Workout template management"),
        (name = "Programs", description = "Workout program management"),
        (name = "Program Workouts", description = "Workouts within a program"),
        (name = "Body Stats", description = "Body measurements"),
        (name = "Body Stats Goals", description = "Body stats goals and progress"),
        (name = "Statistics", description = "Workout statistics and analytics"),
        (name = "Personal Records", description = "Personal records"),
        (name = "Settings", description = "User settings"),
    )
)]
pub struct ApiDoc;

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let components = openapi.components.get_or_insert_default();
        components.add_security_scheme(
            "bearer_auth",
            SecurityScheme::Http(
                HttpBuilder::new()
                    .scheme(HttpAuthScheme::Bearer)
                    .bearer_format("JWT")
                    .build(),
            ),
        );
    }
}
