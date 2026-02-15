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
- Programs, Program Workouts
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

### Demo User & Seed Script

The seed script (`cargo run --bin seed`) creates a fully-featured demo user (demo@example.com / demo1234) with data for every feature in the app. Use `--force` to reset.

**When adding a new feature that stores user data, always update the seed script (`backend/src/bin/seed.rs`) to include demo data for the new feature.** This ensures the demo user showcases all functionality. Specifically:

1. Add a `seed_<feature>()` function with realistic demo data.
2. Call it from `seed_demo_user()`.
3. Add the corresponding `DELETE` statement to `clear_demo_data()` (respecting FK order).

The demo user currently has: workout templates, workout history, personal records, body measurements, body stats goals, workout programs, and user settings.

### README

**When adding a new user-facing feature, always update `README.md`** to reflect the change:

1. Add or update the feature description in the **Features** list.
2. Add any new API endpoints to the **API Overview** table.
3. Update any other sections affected (e.g., Getting Started, Configuration).
