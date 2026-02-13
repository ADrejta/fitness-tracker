# Fitness Tracker - Development Guide

## Project Structure

- `backend/` - Rust/Axum REST API with PostgreSQL
- `frontend/` - Angular frontend application

## Backend

### Build & Run

```bash
cd backend
cargo build
cargo run          # starts the API server
cargo test         # runs all tests
cargo check        # type-check without building
```

### Environment

Requires a `.env` file in `backend/` with `DATABASE_URL` and JWT secret configuration. See `backend/src/config/settings.rs` for all config options.

### API Documentation (OpenAPI/Swagger)

The API is documented with OpenAPI 3.1 via `utoipa`. Swagger UI is available at `/swagger-ui` when the server is running. The raw OpenAPI JSON is at `/api-docs/openapi.json`.

**When adding new endpoints:**

1. Add `#[utoipa::path(...)]` annotation above the handler function specifying method, path, tag, params, request_body, responses, and security.
2. Derive `ToSchema` on any new request/response DTOs.
3. Derive `IntoParams` on any new query parameter structs (and add `#[into_params(rename_all = "camelCase")]` if the struct uses camelCase serde renaming).
4. Register the new handler path and any new schemas in `backend/src/openapi.rs` under the `#[openapi(...)]` attribute.
5. Protected endpoints must include `security(("bearer_auth" = []))`.

**Tag conventions:**

- Auth, Workouts, Workout Exercises, Workout Sets, Workout Supersets
- Exercises, Templates
- Body Stats, Body Stats Goals
- Statistics, Personal Records
- Settings

### Database

Uses SQLx with compile-time query checking (offline mode). Migrations are in `backend/migrations/`.

### Testing

```bash
cargo test                    # all tests
cargo test --lib              # unit tests only
cargo test dto::              # tests for a specific module
```
