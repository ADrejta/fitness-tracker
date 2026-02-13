use axum::{extract::Request, middleware::Next, response::Response};
use uuid::Uuid;

const REQUEST_ID_HEADER: &str = "X-Request-Id";

pub async fn request_id_middleware(mut request: Request, next: Next) -> Response {
    // Use existing request ID from header (e.g. from load balancer) or generate a new one
    let request_id = request
        .headers()
        .get(REQUEST_ID_HEADER)
        .and_then(|v| v.to_str().ok())
        .map(String::from)
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    // Store in request extensions so handlers/other middleware can access it
    request.extensions_mut().insert(RequestId(request_id.clone()));

    let mut response = next.run(request).await;

    // Add request ID to response headers
    if let Ok(value) = request_id.parse() {
        response.headers_mut().insert(REQUEST_ID_HEADER, value);
    }

    response
}

#[derive(Debug, Clone)]
pub struct RequestId(pub String);
