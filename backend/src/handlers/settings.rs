use axum::{extract::State, Extension, Json};
use sqlx::PgPool;

use crate::dto::{SettingsResponse, UpdateSettingsRequest};
use crate::error::AppError;
use crate::middleware::AuthUser;
use crate::repositories::SettingsRepository;

pub async fn get_settings(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<SettingsResponse>, AppError> {
    let settings = SettingsRepository::get_or_create(&pool, auth_user.user_id).await?;

    Ok(Json(SettingsResponse {
        weight_unit: settings.weight_unit,
        measurement_unit: settings.measurement_unit,
        theme: settings.theme,
        default_rest_timer: settings.default_rest_timer,
        auto_start_rest_timer: settings.auto_start_rest_timer,
        show_warmup_sets: settings.show_warmup_sets,
        vibrate_on_timer_end: settings.vibrate_on_timer_end,
        sound_on_timer_end: settings.sound_on_timer_end,
        plate_calculator: settings.plate_calculator,
    }))
}

pub async fn update_settings(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Json(req): Json<UpdateSettingsRequest>,
) -> Result<Json<SettingsResponse>, AppError> {
    let settings = SettingsRepository::update(
        &pool,
        auth_user.user_id,
        req.weight_unit.as_ref(),
        req.measurement_unit.as_ref(),
        req.theme.as_ref(),
        req.default_rest_timer,
        req.auto_start_rest_timer,
        req.show_warmup_sets,
        req.vibrate_on_timer_end,
        req.sound_on_timer_end,
        req.plate_calculator.as_ref(),
    )
    .await?;

    Ok(Json(SettingsResponse {
        weight_unit: settings.weight_unit,
        measurement_unit: settings.measurement_unit,
        theme: settings.theme,
        default_rest_timer: settings.default_rest_timer,
        auto_start_rest_timer: settings.auto_start_rest_timer,
        show_warmup_sets: settings.show_warmup_sets,
        vibrate_on_timer_end: settings.vibrate_on_timer_end,
        sound_on_timer_end: settings.sound_on_timer_end,
        plate_calculator: settings.plate_calculator,
    }))
}
