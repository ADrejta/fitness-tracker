use base64::Engine;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
struct WorkoutCursor {
    started_at: DateTime<Utc>,
    id: Uuid,
}

pub fn encode_cursor(started_at: DateTime<Utc>, id: Uuid) -> String {
    base64::engine::general_purpose::URL_SAFE_NO_PAD
        .encode(serde_json::to_vec(&WorkoutCursor { started_at, id }).unwrap())
}

pub fn decode_cursor(s: &str) -> Option<(DateTime<Utc>, Uuid)> {
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(s)
        .ok()?;
    let c: WorkoutCursor = serde_json::from_slice(&bytes).ok()?;
    Some((c.started_at, c.id))
}
