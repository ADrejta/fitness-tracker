use axum::{
    extract::State,
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    Extension, Json,
};
use sqlx::PgPool;

use validator::Validate;

use crate::dto::{ErrorResponse, SettingsResponse, UpdateSettingsRequest};
use crate::error::AppError;
use crate::etag::{check_none_match, compute_etag};
use crate::middleware::AuthUser;
use crate::repositories::SettingsRepository;

#[utoipa::path(
    get,
    path = "/api/v1/settings",
    tag = "Settings",
    responses(
        (status = 200, description = "User settings", body = SettingsResponse),
        (status = 304, description = "Not modified"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_settings(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, AppError> {
    let settings = if let Some(cached) = crate::cache::get_settings(auth_user.user_id) {
        cached
    } else {
        let s = SettingsRepository::get_or_create(&pool, auth_user.user_id).await?;
        crate::cache::set_settings(auth_user.user_id, s.clone());
        s
    };

    let response = SettingsResponse {
        weight_unit: settings.weight_unit,
        measurement_unit: settings.measurement_unit,
        theme: settings.theme,
        default_rest_timer: settings.default_rest_timer,
        auto_start_rest_timer: settings.auto_start_rest_timer,
        show_warmup_sets: settings.show_warmup_sets,
        vibrate_on_timer_end: settings.vibrate_on_timer_end,
        sound_on_timer_end: settings.sound_on_timer_end,
        plate_calculator: settings.plate_calculator,
        compact_mode: settings.compact_mode,
    };

    let body = serde_json::to_vec(&response).unwrap();
    let etag = compute_etag(&body);

    if check_none_match(&headers, &etag) {
        return Ok(StatusCode::NOT_MODIFIED.into_response());
    }

    Ok(([(header::ETAG, etag)], Json(response)).into_response())
}

#[utoipa::path(
    put,
    path = "/api/v1/settings",
    tag = "Settings",
    request_body = UpdateSettingsRequest,
    responses(
        (status = 200, description = "Settings updated", body = SettingsResponse),
        (status = 400, description = "Validation error", body = ErrorResponse),
    ),
    security(("bearer_auth" = []))
)]
pub async fn update_settings(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Json(req): Json<UpdateSettingsRequest>,
) -> Result<Json<SettingsResponse>, AppError> {
    req.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

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
        req.compact_mode,
    )
    .await?;

    crate::cache::set_settings(auth_user.user_id, settings.clone());

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
        compact_mode: settings.compact_mode,
    }))
}
