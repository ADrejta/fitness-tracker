use std::collections::HashMap;
use std::sync::{OnceLock, RwLock};
use std::time::{Duration, Instant};
use uuid::Uuid;

use crate::models::UserSettings;

// --- Exercise name cache (never-expiring; exercise templates are static seed data) ---

static EXERCISE_NAME_CACHE: OnceLock<RwLock<HashMap<String, String>>> = OnceLock::new();

fn exercise_name_cache() -> &'static RwLock<HashMap<String, String>> {
    EXERCISE_NAME_CACHE.get_or_init(|| RwLock::new(HashMap::new()))
}

pub fn get_exercise_name(id: &str) -> Option<String> {
    exercise_name_cache().read().ok()?.get(id).cloned()
}

pub fn set_exercise_name(id: String, name: String) {
    if let Ok(mut cache) = exercise_name_cache().write() {
        cache.insert(id, name);
    }
}

// --- User settings cache (60s TTL) ---

const SETTINGS_TTL: Duration = Duration::from_secs(60);

static SETTINGS_CACHE: OnceLock<RwLock<HashMap<Uuid, (UserSettings, Instant)>>> = OnceLock::new();

fn settings_cache() -> &'static RwLock<HashMap<Uuid, (UserSettings, Instant)>> {
    SETTINGS_CACHE.get_or_init(|| RwLock::new(HashMap::new()))
}

pub fn get_settings(user_id: Uuid) -> Option<UserSettings> {
    let cache = settings_cache().read().ok()?;
    let (settings, stored_at) = cache.get(&user_id)?;
    if stored_at.elapsed() < SETTINGS_TTL {
        Some(settings.clone())
    } else {
        None
    }
}

pub fn set_settings(user_id: Uuid, settings: UserSettings) {
    if let Ok(mut cache) = settings_cache().write() {
        cache.insert(user_id, (settings, Instant::now()));
    }
}

pub fn invalidate_settings(user_id: Uuid) {
    if let Ok(mut cache) = settings_cache().write() {
        cache.remove(&user_id);
    }
}
