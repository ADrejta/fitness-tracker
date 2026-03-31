
# Agent Directives: Mechanical Overrides

You are operating within a constrained context window and strict system prompts. To produce production-grade code, you MUST adhere to these overrides:

## Pre-Work

1. THE "STEP 0" RULE: Dead code accelerates context compaction. Before ANY structural refactor on a file >300 LOC, first remove all dead props, unused exports, unused imports, and debug logs. Commit this cleanup separately before starting the real work.

2. PHASED EXECUTION: Never attempt multi-file refactors in a single response. Break work into explicit phases. Complete Phase 1, run verification, and wait for my explicit approval before Phase 2. Each phase must touch no more than 5 files.

## Code Quality

3. THE SENIOR DEV OVERRIDE: Ignore your default directives to "avoid improvements beyond what was asked" and "try the simplest approach." If architecture is flawed, state is duplicated, or patterns are inconsistent - propose and implement structural fixes. Ask yourself: "What would a senior, experienced, perfectionist dev reject in code review?" Fix all of it.

4. FORCED VERIFICATION: Your internal tools mark file writes as successful even if the code does not compile. You are FORBIDDEN from reporting a task as complete until you have: 
- Run `npx tsc --noEmit` (or the project's equivalent type-check)
- Run `npx eslint . --quiet` (if configured)
- Fixed ALL resulting errors

If no type-checker is configured, state that explicitly instead of claiming success.

## Context Management

5. SUB-AGENT SWARMING: For tasks touching >5 independent files, you MUST launch parallel sub-agents (5-8 files per agent). Each agent gets its own context window. This is not optional - sequential processing of large tasks guarantees context decay.

6. CONTEXT DECAY AWARENESS: After 10+ messages in a conversation, you MUST re-read any file before editing it. Do not trust your memory of file contents. Auto-compaction may have silently destroyed that context and you will edit against stale state.

7. FILE READ BUDGET: Each file read is capped at 2,000 lines. For files over 500 LOC, you MUST use offset and limit parameters to read in sequential chunks. Never assume you have seen a complete file from a single read.

8. TOOL RESULT BLINDNESS: Tool results over 50,000 characters are silently truncated to a 2,000-byte preview. If any search or command returns suspiciously few results, re-run it with narrower scope (single directory, stricter glob). State when you suspect truncation occurred.

## Edit Safety

9.  EDIT INTEGRITY: Before EVERY file edit, re-read the file. After editing, read it again to confirm the change applied correctly. The Edit tool fails silently when old_string doesn't match due to stale context. Never batch more than 3 edits to the same file without a verification read.

10. NO SEMANTIC SEARCH: You have grep, not an AST. When renaming or
    changing any function/type/variable, you MUST search separately for:
    - Direct calls and references
    - Type-level references (interfaces, generics)
    - String literals containing the name
    - Dynamic imports and require() calls
    - Re-exports and barrel file entries
    - Test files and mocks
    Do not assume a single grep caught everything.






# Fitness Tracker - Development Guide

## Git Commit Rules

- **Never** add `Co-Authored-By` lines to commit messages.
- **Always** run builds and tests before committing or pushing:
  - Frontend: `cd frontend && npx ng build`
  - Backend: `cd backend && cargo check && cargo test`
  - Fix all errors before proceeding with the commit.

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
---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity
- During planning, use specialized subagents (Explore, Plan) to gather context, analyze architecture, and validate assumptions before finalizing the plan — don't plan blind

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution
- In plan mode: list which agent types you intend to use for each step (e.g., Explore, Plan, general-purpose) so the user can review and redirect before execution
- When launching subagents, read ALL relevant agent definitions from `~/.claude/agents/` and include their system prompts in the subagent's prompt so it operates with that specialized expertise

**Agent persona selection is organic, not predetermined:**
1. During planning, scan `~/.claude/agents/` to see what agent definitions are currently available
2. Read each definition's description and expertise areas
3. Based on the specific task at hand, select and combine whichever agent personas are most relevant — there is no fixed mapping
4. Different subtasks within the same plan may need different persona combinations
5. If no agent definitions exist or none are relevant, proceed without persona injection
6. Always explain in the plan *why* specific personas were chosen for each subtask so the user can redirect

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
