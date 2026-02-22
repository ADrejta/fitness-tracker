use axum::http::{header, HeaderMap};
use sha2::{Digest, Sha256};

pub fn compute_etag(bytes: &[u8]) -> String {
    format!("\"{}\"", hex::encode(Sha256::digest(bytes)))
}

pub fn check_none_match(headers: &HeaderMap, etag: &str) -> bool {
    headers
        .get(header::IF_NONE_MATCH)
        .and_then(|v| v.to_str().ok())
        .map_or(false, |v| v == etag)
}
