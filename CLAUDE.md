# Fitness Tracker - Development Guide

## Git Commit Rules

- **Never** add `Co-Authored-By` lines to commit messages.

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

### Database Query Rules — Avoid N+1

**Never query inside a loop.** Every loop that calls a repository function is an N+1 bug.

**The pattern to avoid:**
```rust
let exercises = repo::get_exercises(pool, workout_id).await?;
for exercise in exercises {
    let sets = repo::get_sets(pool, exercise.id).await?; // ❌ N+1
}
```

**The correct patterns:**

1. **JOIN** — when loading a parent with its children (exercises + sets for one workout):
```sql
SELECT we.id as exercise_id, ..., ws.id as set_id, ...
FROM workout_exercises we
LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
WHERE we.workout_id = $1
ORDER BY we.order_index, ws.set_number
```
Then group the flat rows into the nested structure in Rust using a `current_id` sentinel or `HashMap`.

2. **`= ANY($1)` batch fetch** — when loading children for multiple parents (sets for N exercises across different workouts):
```sql
SELECT * FROM workout_sets
WHERE workout_exercise_id = ANY($1)   -- $1 is &[Uuid]
ORDER BY workout_exercise_id, set_number
```
Then group into a `HashMap<Uuid, Vec<_>>` and look up per parent.

3. **Window function** — when you need the top-N rows per group (last 3 sessions per exercise):
```sql
SELECT * FROM (
    SELECT ..., ROW_NUMBER() OVER (PARTITION BY exercise_id ORDER BY date DESC) as rn
    FROM ...
) sub WHERE rn <= 3
```

**Existing batch helpers** (use these, don't add new loops):
- `WorkoutRepository::get_exercises_with_sets(pool, workout_id)` — JOIN for one workout
- `WorkoutRepository::get_sets_batch(pool, &[Uuid])` — ANY batch for sets
- `ProgramRepository::find_workouts_batch(pool, &[Uuid])` — ANY batch for program workouts
- `StatisticsService::batch_fetch_completed_sets` / `batch_fetch_working_sets` — ANY batch for stats

### README

**When adding a new user-facing feature, always update `README.md`** to reflect the change:

1. Add or update the feature description in the **Features** list.
2. Add any new API endpoints to the **API Overview** table.
3. Update any other sections affected (e.g., Getting Started, Configuration).

---

## Already-Implemented Features

Do **not** suggest these as new features — they are fully built:

### Workout Experience
- **Rest timer** — global default duration, auto-start after set completion, vibration on end (`vibrate_on_timer_end` setting; `RestTimerComponent`)
- **Warm-up calculator** — per-exercise, calculates warm-up sets from working weight for kg or lbs (`calculateWarmupSets` util; `WorkoutExerciseComponent`)
- **Plate calculator** — given target weight + bar type, shows exact plates per side; customizable bars and plate sets in settings (`PlateCalculatorComponent`; `plate_calculator` JSONB in `user_settings`)
- **Supersets** — group exercises into supersets during a workout; backend stores `superset_id` on `workout_exercises`; frontend renders grouped UI with label and dissolve button
- **Exercise progression suggestions** — per-exercise overload recommendations (increase weight / increase reps / maintain) computed from recent history (`StatisticsService::get_overload_suggestions`; shown in `SetRowComponent` as `ProgressionSuggestion`)
- **Exercise notes** — per-exercise free-text notes saved via `PATCH /workouts/{id}/exercises/{id}`; shown in history detail view
- **Workout notes** — free-text notes on a workout, shown in history detail view
- **Workout tags** — `TEXT[]` tags on workouts; chip input during active workout; filter row + badges in history list; tags shown in workout detail

### Templates & Programs
- **Workout templates** — full CRUD; exercise + set configuration; `last_used_at` tracking; recent templates shown on workout start screen
- **Workout programs** — multi-week programs with ordered workout days; `current_week`/`current_day` progress tracking; preset programs included
- **Program progress tracker** — Schedule | Progress toggle in program detail modal; week-by-week adherence grid showing per-day status (completed ✓, rest –, current ●, skipped ✗, upcoming ○); overall adherence %, per-week counts, Done/Current badges
- **Start workout from template** — copies exercises and sets, increments template usage counter
- **Repeat workout** — re-creates a completed workout as a new active workout with the same exercises and target weights/reps
- **Save workout as template** — (UI stub present in workout menu)

### History & Analytics
- **Paginated workout history** — list view with date grouping (Today / Yesterday / This Week / This Month / Older); 20-per-page with prev/next pagination
- **Calendar history view** — monthly calendar with dot indicators on workout days; click a day to see workouts
- **Workout detail** — full breakdown of exercises, sets (weight × reps, RPE, warmup flag), duration, volume, notes, tags, exercise notes
- **Personal records** — tracked for max weight, max reps, estimated 1RM (Brzycki); detected automatically on workout completion; PR list view with filtering
- **Exercise statistics** — per-exercise progress charts (volume, max weight, estimated 1RM over time); recent sessions; progression suggestion (`StatisticsService`)
- **Dashboard summary** — weekly volume, sets, workout count, streak; recent workouts; muscle group breakdown; all 6 queries run in parallel via `tokio::join!`
- **Workout streak** — current streak and longest streak computed from completed workout history
- **CSV export** — exports full workout history (date, workout, exercise, set, reps, weight, RPE, notes)
- **Muscle group volume heatmap** — weekly/monthly grid (10 muscles × N periods) with heat-0–heat-4 color intensity; backend `GET /statistics/muscle-heatmap?count=N&monthly=bool` returns flat rows; shown in Statistics page with period toggle
- **Strength standards** — compare best PRs to beginner/intermediate/advanced/elite benchmarks (relative to bodyweight) for Bench Press, Back Squat, Deadlift, Overhead Press, Barbell Row; visual progress bar with benchmark ticks; requires body weight logged in Body Stats

### Body Stats
- **Body measurements** — log weight, body fat %, and 10+ measurement types (chest, waist, hips, etc.); full history with trend charts
- **Body stats goals** — set target values for any measurement type; progress % computed against latest measurement

### Settings & UX
- **Dark / light / system theme** — full CSS variable theming; theme applied immediately on load to prevent flash (`data-theme` attribute on `<html>`)
- **Compact / dense mode** — `[data-compact='true']` on `<html>` tightens spacing, font sizes, and header/nav height; toggle in Settings → Appearance; persisted to DB (`compact_mode` boolean column) and localStorage; applied via Angular effect same pattern as theme
- **Weight unit** — kg or lbs; stored in settings; all weight display and plate calculator respect the unit
- **Demo mode** — seed script (`cargo run --bin seed`) creates `demo@example.com / demo1234` with full realistic data for every feature
- **PWA / offline support** — `@angular/service-worker` with `ngsw-config.json`; app shell prefetched; API cached with freshness strategy; `manifest.webmanifest` with theme color and icons
- **Offline sync queue** — `SyncQueueService` + `offlineSyncInterceptor`; failed mutations (POST/PUT/PATCH/DELETE to `/api/v1/`) with status 0 are queued in localStorage (`fitness_tracker_syncQueue`); replayed automatically on reconnect via `HttpBackend` (bypasses interceptors) with a fresh token; amber badge in header shows pending count and triggers manual replay on click; online/offline dot in header reflects `navigator.onLine` in real time

### Infrastructure
- **JWT authentication** — access + refresh token pair; refresh endpoint; auth middleware on all protected routes
- **Rate limiting** — 20 req/s general, 5/min on auth endpoints (`middleware/rate_limit.rs`)
- **Response compression** — `CompressionLayer` on all API responses
- **In-memory caching** — exercise names (never-expiring) and user settings (60 s TTL) via `OnceLock<RwLock<HashMap>>` in `cache.rs`
- **Composite DB indexes** — on frequently-queried columns (workout_id + order_index, exercise_template_id + completed_at, etc.)
