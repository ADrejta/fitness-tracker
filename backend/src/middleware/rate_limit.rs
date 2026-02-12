use axum::http;
use governor::middleware::NoOpMiddleware;
use std::net::SocketAddr;
use tower_governor::{
    governor::GovernorConfigBuilder,
    key_extractor::KeyExtractor,
    GovernorError, GovernorLayer,
};

/// Custom key extractor that uses X-Forwarded-For header, peer IP, or falls back to localhost
#[derive(Clone)]
pub struct SmartIpKeyExtractor;

impl KeyExtractor for SmartIpKeyExtractor {
    type Key = String;

    fn extract<T>(&self, req: &http::Request<T>) -> Result<Self::Key, GovernorError> {
        // Try X-Forwarded-For header first (for reverse proxy setups)
        if let Some(forwarded) = req.headers().get("x-forwarded-for") {
            if let Ok(value) = forwarded.to_str() {
                if let Some(ip) = value.split(',').next() {
                    let ip_str: String = ip.trim().to_string();
                    return Ok(ip_str);
                }
            }
        }

        // Try X-Real-IP header
        if let Some(real_ip) = req.headers().get("x-real-ip") {
            if let Ok(value) = real_ip.to_str() {
                let ip_str: String = value.trim().to_string();
                return Ok(ip_str);
            }
        }

        // Try to get peer IP from connection info
        if let Some(addr) = req.extensions().get::<axum::extract::ConnectInfo<SocketAddr>>() {
            return Ok(addr.0.ip().to_string());
        }

        // Fallback to localhost for local development
        Ok("127.0.0.1".to_string())
    }
}

/// Type alias for our rate limiter layer
pub type RateLimitLayer = GovernorLayer<SmartIpKeyExtractor, NoOpMiddleware, axum::body::Body>;

/// Creates a general rate limiter: ~100 requests per minute per IP
/// Allows burst of 20 requests
pub fn general_rate_limiter() -> RateLimitLayer {
    let config = GovernorConfigBuilder::default()
        .per_second(2) // ~120 per minute
        .burst_size(20)
        .key_extractor(SmartIpKeyExtractor)
        .finish()
        .expect("Failed to build general rate limiter config");

    GovernorLayer::new(config)
}

/// Creates a strict rate limiter for auth endpoints: 5 requests per minute per IP
/// Protects against brute force attacks on login/register
pub fn auth_rate_limiter() -> RateLimitLayer {
    let config = GovernorConfigBuilder::default()
        .per_second(12) // 1 request per 12 seconds = 5 per minute
        .burst_size(5)
        .key_extractor(SmartIpKeyExtractor)
        .finish()
        .expect("Failed to build auth rate limiter config");

    GovernorLayer::new(config)
}
