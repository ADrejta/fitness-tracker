use sqlx::PgPool;
use sqlx::types::Json;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{MeasurementUnit, PlateCalculatorSettings, Theme, UserSettings, WeightUnit};

pub struct SettingsRepository;

impl SettingsRepository {
    pub async fn get_or_create(pool: &PgPool, user_id: Uuid) -> Result<UserSettings, AppError> {
        let settings = sqlx::query_as::<_, UserSettings>(
            "SELECT * FROM user_settings WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

        if let Some(settings) = settings {
            return Ok(settings);
        }

        // Create default settings
        let default = UserSettings {
            user_id,
            ..Default::default()
        };

        let settings = sqlx::query_as::<_, UserSettings>(
            r#"
            INSERT INTO user_settings (user_id, weight_unit, measurement_unit, theme, default_rest_timer, auto_start_rest_timer, show_warmup_sets, vibrate_on_timer_end, sound_on_timer_end, plate_calculator, compact_mode)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            "#,
        )
        .bind(user_id)
        .bind(&default.weight_unit)
        .bind(&default.measurement_unit)
        .bind(&default.theme)
        .bind(default.default_rest_timer)
        .bind(default.auto_start_rest_timer)
        .bind(default.show_warmup_sets)
        .bind(default.vibrate_on_timer_end)
        .bind(default.sound_on_timer_end)
        .bind(Json(&default.plate_calculator))
        .bind(default.compact_mode)
        .fetch_one(pool)
        .await?;

        Ok(settings)
    }

    pub async fn update(
        pool: &PgPool,
        user_id: Uuid,
        weight_unit: Option<&WeightUnit>,
        measurement_unit: Option<&MeasurementUnit>,
        theme: Option<&Theme>,
        default_rest_timer: Option<i32>,
        auto_start_rest_timer: Option<bool>,
        show_warmup_sets: Option<bool>,
        vibrate_on_timer_end: Option<bool>,
        sound_on_timer_end: Option<bool>,
        plate_calculator: Option<&PlateCalculatorSettings>,
        compact_mode: Option<bool>,
    ) -> Result<UserSettings, AppError> {
        // Ensure settings exist
        Self::get_or_create(pool, user_id).await?;

        let settings = sqlx::query_as::<_, UserSettings>(
            r#"
            UPDATE user_settings SET
                weight_unit = COALESCE($2, weight_unit),
                measurement_unit = COALESCE($3, measurement_unit),
                theme = COALESCE($4, theme),
                default_rest_timer = COALESCE($5, default_rest_timer),
                auto_start_rest_timer = COALESCE($6, auto_start_rest_timer),
                show_warmup_sets = COALESCE($7, show_warmup_sets),
                vibrate_on_timer_end = COALESCE($8, vibrate_on_timer_end),
                sound_on_timer_end = COALESCE($9, sound_on_timer_end),
                plate_calculator = COALESCE($10, plate_calculator),
                compact_mode = COALESCE($11, compact_mode)
            WHERE user_id = $1
            RETURNING *
            "#,
        )
        .bind(user_id)
        .bind(weight_unit)
        .bind(measurement_unit)
        .bind(theme)
        .bind(default_rest_timer)
        .bind(auto_start_rest_timer)
        .bind(show_warmup_sets)
        .bind(vibrate_on_timer_end)
        .bind(sound_on_timer_end)
        .bind(plate_calculator.map(Json))
        .bind(compact_mode)
        .fetch_one(pool)
        .await?;

        Ok(settings)
    }
}
