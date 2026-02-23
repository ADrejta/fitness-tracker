//! Seed script for populating the database with demo data
//!
//! Run with: cargo run --bin seed
//!
//! Demo user credentials: demo@example.com / demo1234

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use chrono::{Duration, Utc};
use sqlx::postgres::PgPoolOptions;
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load environment variables
    dotenvy::dotenv().ok();

    // Check for --force flag
    let force = std::env::args().any(|arg| arg == "--force");

    // Support both DATABASE_URL and DATABASE__URL (nested config format)
    let database_url = std::env::var("DATABASE_URL")
        .or_else(|_| std::env::var("DATABASE__URL"))
        .expect("DATABASE_URL or DATABASE__URL must be set");

    println!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    if force {
        println!("Force flag detected. Clearing existing demo data...");
        clear_demo_data(&pool).await?;
    }

    println!("Seeding demo user...");
    seed_demo_user(&pool).await?;

    println!("Seeding admin user...");
    seed_admin_user(&pool).await?;

    println!("\n✓ Demo user ready!");
    println!("  Email: demo@example.com");
    println!("  Password: demo1234");
    println!("\n✓ Admin user ready!");
    println!("  Email: admin@example.com");
    println!("  Password: admin1234");

    Ok(())
}

async fn clear_demo_data(pool: &sqlx::PgPool) -> Result<(), Box<dyn std::error::Error>> {
    let user_id = Uuid::parse_str("a0000000-0000-0000-0000-000000000001")?;

    // Delete in order to respect foreign key constraints
    sqlx::query("DELETE FROM user_settings WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;

    sqlx::query("DELETE FROM body_stats_goals WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;

    sqlx::query("DELETE FROM body_measurements WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;

    sqlx::query("DELETE FROM personal_records WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;

    // Delete program workouts, then programs
    sqlx::query(
        "DELETE FROM program_workouts WHERE program_id IN
         (SELECT id FROM workout_programs WHERE user_id = $1)"
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    sqlx::query("DELETE FROM workout_programs WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;

    // Delete workout sets, exercises, then workouts
    sqlx::query(
        "DELETE FROM workout_sets WHERE workout_exercise_id IN
         (SELECT id FROM workout_exercises WHERE workout_id IN
          (SELECT id FROM workouts WHERE user_id = $1))"
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    sqlx::query(
        "DELETE FROM workout_exercises WHERE workout_id IN
         (SELECT id FROM workouts WHERE user_id = $1)"
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    sqlx::query("DELETE FROM workouts WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;

    // Delete template sets, exercises, then templates
    sqlx::query(
        "DELETE FROM template_sets WHERE template_exercise_id IN
         (SELECT id FROM template_exercises WHERE template_id IN
          (SELECT id FROM workout_templates WHERE user_id = $1))"
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    sqlx::query(
        "DELETE FROM template_exercises WHERE template_id IN
         (SELECT id FROM workout_templates WHERE user_id = $1)"
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    sqlx::query("DELETE FROM workout_templates WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;

    // Finally delete the user
    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;

    // Delete admin user
    sqlx::query("DELETE FROM users WHERE email = 'admin@example.com'")
        .execute(pool)
        .await?;

    println!("  Cleared all demo data");
    Ok(())
}

fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| e.to_string())?;
    Ok(hash.to_string())
}

async fn seed_demo_user(pool: &sqlx::PgPool) -> Result<(), Box<dyn std::error::Error>> {
    let user_id = Uuid::parse_str("a0000000-0000-0000-0000-000000000001")?;

    // Check if demo user already exists
    let existing: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM users WHERE email = 'demo@example.com')"
    )
    .fetch_one(pool)
    .await?;

    let mut tx = pool.begin().await?;

    if existing {
        println!("  Demo user already exists, checking for data...");

        // Check if workouts exist
        let has_workouts: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM workouts WHERE user_id = $1)"
        )
        .bind(user_id)
        .fetch_one(&mut *tx)
        .await?;

        if has_workouts {
            println!("  Demo data already exists. Nothing to do.");
            tx.rollback().await?;
            return Ok(());
        }

        println!("  Demo user exists but has no data. Seeding data...");
    } else {
        // Create demo user
        let password_hash = hash_password("demo1234")
            .map_err(|e| format!("Failed to hash password: {}", e))?;

        sqlx::query(
            "INSERT INTO users (id, email, password_hash, created_at)
             VALUES ($1, 'demo@example.com', $2, NOW() - INTERVAL '30 days')"
        )
        .bind(user_id)
        .bind(&password_hash)
        .execute(&mut *tx)
        .await?;

        println!("  Created demo user");
    }

    // Create workout templates
    seed_templates(&mut tx, user_id).await?;
    println!("  Created workout templates");

    // Create completed workouts
    seed_workouts(&mut tx, user_id).await?;
    println!("  Created workout history");

    // Create personal records
    seed_personal_records(&mut tx, user_id).await?;
    println!("  Created personal records");

    // Create body measurements
    seed_body_measurements(&mut tx, user_id).await?;
    println!("  Created body measurements");

    // Create body stats goals
    seed_body_stats_goals(&mut tx, user_id).await?;
    println!("  Created body stats goals");

    // Create workout programs
    seed_programs(&mut tx, user_id).await?;
    println!("  Created workout programs");

    // Create user settings
    seed_user_settings(&mut tx, user_id).await?;
    println!("  Created user settings");

    // Create cardio workouts
    seed_cardio_workouts(&mut tx, user_id).await?;
    println!("  Created cardio workouts");

    tx.commit().await?;
    Ok(())
}

async fn seed_templates(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
) -> Result<(), Box<dyn std::error::Error>> {
    let templates = [
        ("Push Day", "Chest, shoulders, and triceps workout", 60, 8),
        ("Pull Day", "Back and biceps workout", 55, 7),
        ("Leg Day", "Quads, hamstrings, and calves", 65, 6),
    ];

    let template_exercises = [
        // Push Day
        (0, vec![
            ("ex-bench-press", "Barbell Bench Press", vec![(8, 60.0), (8, 60.0), (8, 60.0), (8, 60.0)]),
            ("ex-ohp", "Overhead Press", vec![(8, 40.0), (8, 40.0), (8, 40.0)]),
            ("ex-db-incline-bench", "Incline Dumbbell Press", vec![(10, 22.0), (10, 22.0), (10, 22.0)]),
            ("ex-tricep-pushdown", "Tricep Pushdown", vec![(12, 25.0), (12, 25.0), (12, 25.0)]),
        ]),
        // Pull Day
        (1, vec![
            ("ex-deadlift", "Conventional Deadlift", vec![(5, 100.0), (5, 100.0), (5, 100.0), (5, 100.0)]),
            ("ex-bent-row", "Barbell Bent Over Row", vec![(8, 60.0), (8, 60.0), (8, 60.0)]),
            ("ex-pull-up", "Pull-Up", vec![(8, 0.0), (8, 0.0), (8, 0.0)]),
            ("ex-barbell-curl", "Barbell Curl", vec![(10, 25.0), (10, 25.0), (10, 25.0)]),
        ]),
        // Leg Day
        (2, vec![
            ("ex-squat", "Barbell Back Squat", vec![(6, 80.0), (6, 80.0), (6, 80.0), (6, 80.0)]),
            ("ex-leg-press", "Leg Press", vec![(10, 120.0), (10, 120.0), (10, 120.0)]),
            ("ex-romanian-dl", "Romanian Deadlift", vec![(10, 60.0), (10, 60.0), (10, 60.0)]),
            ("ex-leg-curl", "Lying Leg Curl", vec![(12, 35.0), (12, 35.0), (12, 35.0)]),
        ]),
    ];

    let mut template_ids = Vec::new();

    for (name, description, duration, usage_count) in templates {
        let template_id = Uuid::new_v4();
        template_ids.push(template_id);

        sqlx::query(
            "INSERT INTO workout_templates (id, user_id, name, description, estimated_duration, created_at, usage_count)
             VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '25 days', $6)"
        )
        .bind(template_id)
        .bind(user_id)
        .bind(name)
        .bind(description)
        .bind(duration)
        .bind(usage_count)
        .execute(&mut **tx)
        .await?;
    }

    for (template_idx, exercises) in template_exercises {
        let template_id = template_ids[template_idx];

        for (order_idx, (ex_template_id, ex_name, sets)) in exercises.iter().enumerate() {
            let exercise_id = Uuid::new_v4();

            sqlx::query(
                "INSERT INTO template_exercises (id, template_id, exercise_template_id, exercise_name, order_index)
                 VALUES ($1, $2, $3, $4, $5)"
            )
            .bind(exercise_id)
            .bind(template_id)
            .bind(*ex_template_id)
            .bind(*ex_name)
            .bind(order_idx as i32)
            .execute(&mut **tx)
            .await?;

            for (set_num, (reps, weight)) in sets.iter().enumerate() {
                let weight_val = if *weight > 0.0 { Some(*weight) } else { None };

                sqlx::query(
                    "INSERT INTO template_sets (id, template_exercise_id, set_number, target_reps, target_weight, is_warmup)
                     VALUES ($1, $2, $3, $4, $5, false)"
                )
                .bind(Uuid::new_v4())
                .bind(exercise_id)
                .bind((set_num + 1) as i32)
                .bind(*reps)
                .bind(weight_val)
                .execute(&mut **tx)
                .await?;
            }
        }
    }

    Ok(())
}

async fn seed_workouts(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
) -> Result<(), Box<dyn std::error::Error>> {
    let now = Utc::now();

    // Workout schedule: Push, Pull, Legs repeating
    let workout_schedule = [
        (21, "Push Day", 4520.0, 13, 114, 3300),
        (19, "Pull Day", 5200.0, 13, 95, 3000),
        (17, "Leg Day", 6800.0, 13, 108, 3600),
        (14, "Push Day", 4680.0, 13, 116, 3120),
        (12, "Pull Day", 5400.0, 13, 97, 2880),
        (10, "Leg Day", 7100.0, 13, 110, 3480),
        (7, "Push Day", 4840.0, 13, 118, 3240),
        (5, "Pull Day", 5600.0, 13, 99, 3060),
        (3, "Leg Day", 7400.0, 13, 112, 3720),
        (1, "Push Day", 5000.0, 13, 120, 3360),
    ];

    for (days_ago, name, volume, total_sets, total_reps, duration_secs) in workout_schedule {
        let workout_id = Uuid::new_v4();
        let started_at = now - Duration::days(days_ago);
        let completed_at = started_at + Duration::seconds(duration_secs);

        sqlx::query(
            "INSERT INTO workouts (id, user_id, name, started_at, completed_at, total_volume, total_sets, total_reps, duration, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed')"
        )
        .bind(workout_id)
        .bind(user_id)
        .bind(name)
        .bind(started_at)
        .bind(completed_at)
        .bind(volume)
        .bind(total_sets)
        .bind(total_reps)
        .bind(duration_secs as i32)
        .execute(&mut **tx)
        .await?;

        // Add exercises based on workout type
        let exercises: Vec<(&str, &str, i32, f64)> = match name {
            "Push Day" => vec![
                ("ex-bench-press", "Barbell Bench Press", 8, 60.0 + (21 - days_ago) as f64 * 0.25),
                ("ex-ohp", "Overhead Press", 8, 40.0 + (21 - days_ago) as f64 * 0.15),
                ("ex-db-incline-bench", "Incline Dumbbell Press", 10, 22.0 + (21 - days_ago) as f64 * 0.1),
                ("ex-tricep-pushdown", "Tricep Pushdown", 12, 25.0 + (21 - days_ago) as f64 * 0.15),
            ],
            "Pull Day" => vec![
                ("ex-deadlift", "Conventional Deadlift", 5, 100.0 + (21 - days_ago) as f64 * 0.5),
                ("ex-bent-row", "Barbell Bent Over Row", 8, 60.0 + (21 - days_ago) as f64 * 0.25),
                ("ex-pull-up", "Pull-Up", 8, 0.0),
                ("ex-barbell-curl", "Barbell Curl", 10, 25.0 + (21 - days_ago) as f64 * 0.1),
            ],
            "Leg Day" => vec![
                ("ex-squat", "Barbell Back Squat", 6, 80.0 + (21 - days_ago) as f64 * 0.4),
                ("ex-leg-press", "Leg Press", 10, 120.0 + (21 - days_ago) as f64 * 0.5),
                ("ex-romanian-dl", "Romanian Deadlift", 10, 60.0 + (21 - days_ago) as f64 * 0.25),
                ("ex-leg-curl", "Lying Leg Curl", 12, 35.0 + (21 - days_ago) as f64 * 0.15),
            ],
            _ => vec![],
        };

        for (order_idx, (ex_template_id, ex_name, target_reps, weight)) in exercises.iter().enumerate() {
            let exercise_id = Uuid::new_v4();

            sqlx::query(
                "INSERT INTO workout_exercises (id, workout_id, exercise_template_id, exercise_name, order_index)
                 VALUES ($1, $2, $3, $4, $5)"
            )
            .bind(exercise_id)
            .bind(workout_id)
            .bind(*ex_template_id)
            .bind(*ex_name)
            .bind(order_idx as i32)
            .execute(&mut **tx)
            .await?;

            // Add sets (4 for compound lifts, 3 for accessories)
            let num_sets = if order_idx == 0 { 4 } else { 3 };
            for set_num in 1..=num_sets {
                // Last set has slightly fewer reps (fatigue simulation)
                let actual_reps = if set_num == num_sets { target_reps - 1 } else { *target_reps };
                let weight_val = if *weight > 0.0 { Some(*weight) } else { None };
                let set_completed_at = started_at + Duration::minutes((order_idx * 12 + set_num * 3) as i64);
                // RPE increases with later sets to simulate fatigue (7-9 range)
                let rpe: i16 = 7 + (set_num as i16 - 1).min(2);

                sqlx::query(
                    "INSERT INTO workout_sets (id, workout_exercise_id, set_number, target_reps, actual_reps, target_weight, actual_weight, is_warmup, is_completed, completed_at, rpe)
                     VALUES ($1, $2, $3, $4, $5, $6, $6, false, true, $7, $8)"
                )
                .bind(Uuid::new_v4())
                .bind(exercise_id)
                .bind(set_num as i32)
                .bind(*target_reps)
                .bind(actual_reps)
                .bind(weight_val)
                .bind(set_completed_at)
                .bind(rpe)
                .execute(&mut **tx)
                .await?;
            }
        }
    }

    Ok(())
}

async fn seed_personal_records(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
) -> Result<(), Box<dyn std::error::Error>> {
    let now = Utc::now();

    // Get the most recent workout ID for linking PRs
    let latest_workout_id: Uuid = sqlx::query_scalar(
        "SELECT id FROM workouts WHERE user_id = $1 ORDER BY completed_at DESC LIMIT 1"
    )
    .bind(user_id)
    .fetch_one(&mut **tx)
    .await?;

    // Personal records for main compound lifts (reflecting best performance from workouts)
    // These are the "current best" values calculated from workout progression
    let records = [
        // Bench Press PRs
        ("ex-bench-press", "Barbell Bench Press", "max-weight", 65.0, Some(8), 1),  // Most recent push day
        ("ex-bench-press", "Barbell Bench Press", "estimated-1rm", 82.0, None, 1),

        // Deadlift PRs
        ("ex-deadlift", "Conventional Deadlift", "max-weight", 110.0, Some(5), 5),
        ("ex-deadlift", "Conventional Deadlift", "estimated-1rm", 128.0, None, 5),

        // Squat PRs
        ("ex-squat", "Barbell Back Squat", "max-weight", 88.0, Some(6), 3),
        ("ex-squat", "Barbell Back Squat", "estimated-1rm", 105.0, None, 3),

        // Overhead Press PRs
        ("ex-ohp", "Overhead Press", "max-weight", 43.0, Some(8), 1),
        ("ex-ohp", "Overhead Press", "estimated-1rm", 54.0, None, 1),

        // Bent Over Row PRs
        ("ex-bent-row", "Barbell Bent Over Row", "max-weight", 65.0, Some(8), 5),
        ("ex-bent-row", "Barbell Bent Over Row", "estimated-1rm", 82.0, None, 5),

        // Leg Press PR
        ("ex-leg-press", "Leg Press", "max-weight", 130.0, Some(10), 3),
        ("ex-leg-press", "Leg Press", "estimated-1rm", 173.0, None, 3),

        // Romanian Deadlift PR
        ("ex-romanian-dl", "Romanian Deadlift", "max-weight", 65.0, Some(10), 3),
        ("ex-romanian-dl", "Romanian Deadlift", "estimated-1rm", 87.0, None, 3),

        // Pull-Up PR (bodyweight, so tracking max reps)
        ("ex-pull-up", "Pull-Up", "max-reps", 8.0, None, 5),

        // Barbell Curl PR
        ("ex-barbell-curl", "Barbell Curl", "max-weight", 27.0, Some(10), 5),
        ("ex-barbell-curl", "Barbell Curl", "estimated-1rm", 36.0, None, 5),
    ];

    for (ex_template_id, ex_name, record_type, value, reps, days_ago) in records {
        let achieved_at = now - Duration::days(days_ago);

        sqlx::query(
            "INSERT INTO personal_records (id, user_id, exercise_template_id, exercise_name, record_type, value, reps, achieved_at, workout_id)
             VALUES ($1, $2, $3, $4, $5::record_type, $6, $7, $8, $9)"
        )
        .bind(Uuid::new_v4())
        .bind(user_id)
        .bind(ex_template_id)
        .bind(ex_name)
        .bind(record_type)
        .bind(value)
        .bind(reps)
        .bind(achieved_at)
        .bind(latest_workout_id)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

async fn seed_body_measurements(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
) -> Result<(), Box<dyn std::error::Error>> {
    let now = Utc::now();

    // Body measurements showing progress over a month
    let measurements = [
        (28, 82.5, 18.5, 102.0, 86.0, 35.0, 35.5, 118.0),
        (21, 82.2, 18.2, 102.5, 85.5, 35.2, 35.7, 118.5),
        (14, 81.8, 17.8, 103.0, 85.0, 35.5, 36.0, 119.0),
        (7, 81.5, 17.5, 103.5, 84.5, 35.8, 36.2, 119.5),
        (0, 81.2, 17.2, 104.0, 84.0, 36.0, 36.5, 120.0),
    ];

    for (days_ago, weight, body_fat, chest, waist, left_bicep, right_bicep, shoulders) in measurements {
        let date = (now - Duration::days(days_ago)).date_naive();

        sqlx::query(
            "INSERT INTO body_measurements (id, user_id, date, weight, body_fat_percentage, chest, waist, left_bicep, right_bicep, shoulders)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (user_id, date) DO NOTHING"
        )
        .bind(Uuid::new_v4())
        .bind(user_id)
        .bind(date)
        .bind(weight)
        .bind(body_fat)
        .bind(chest)
        .bind(waist)
        .bind(left_bicep)
        .bind(right_bicep)
        .bind(shoulders)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

async fn seed_body_stats_goals(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
) -> Result<(), Box<dyn std::error::Error>> {
    let now = Utc::now();

    // Goal: lose weight from 82.5 to 78 kg
    sqlx::query(
        "INSERT INTO body_stats_goals (id, user_id, goal_type, measurement_type, target_value, start_value, start_date, target_date, is_completed)
         VALUES ($1, $2, 'weight'::goal_type, 'weight'::measurement_type, $3, $4, $5, $6, false)"
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(78.0_f64)
    .bind(82.5_f64)
    .bind((now - Duration::days(28)).date_naive())
    .bind((now + Duration::days(60)).date_naive())
    .execute(&mut **tx)
    .await?;

    // Goal: reduce body fat from 18.5% to 15%
    sqlx::query(
        "INSERT INTO body_stats_goals (id, user_id, goal_type, measurement_type, target_value, start_value, start_date, target_date, is_completed)
         VALUES ($1, $2, 'body-fat'::goal_type, 'body_fat_percentage'::measurement_type, $3, $4, $5, $6, false)"
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(15.0_f64)
    .bind(18.5_f64)
    .bind((now - Duration::days(28)).date_naive())
    .bind((now + Duration::days(90)).date_naive())
    .execute(&mut **tx)
    .await?;

    // Goal: grow biceps from 35cm to 38cm
    sqlx::query(
        "INSERT INTO body_stats_goals (id, user_id, goal_type, measurement_type, target_value, start_value, start_date, target_date, is_completed)
         VALUES ($1, $2, 'measurement'::goal_type, 'right_bicep'::measurement_type, $3, $4, $5, $6, false)"
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(38.0_f64)
    .bind(35.5_f64)
    .bind((now - Duration::days(28)).date_naive())
    .bind((now + Duration::days(120)).date_naive())
    .execute(&mut **tx)
    .await?;

    Ok(())
}

async fn seed_programs(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
) -> Result<(), Box<dyn std::error::Error>> {
    let now = Utc::now();

    // Get template IDs (Push, Pull, Leg - created in order)
    let template_ids: Vec<Uuid> = sqlx::query_scalar(
        "SELECT id FROM workout_templates WHERE user_id = $1 ORDER BY created_at ASC"
    )
    .bind(user_id)
    .fetch_all(&mut **tx)
    .await?;

    let (push_id, pull_id, leg_id) = if template_ids.len() >= 3 {
        (template_ids[0], template_ids[1], template_ids[2])
    } else {
        return Ok(()); // Skip if templates weren't created
    };

    // Create a 4-week PPL program (active, in week 2)
    let program_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO workout_programs (id, user_id, name, description, duration_weeks, is_active, current_week, current_day, started_at, created_at)
         VALUES ($1, $2, $3, $4, $5, true, 2, 1, $6, $7)"
    )
    .bind(program_id)
    .bind(user_id)
    .bind("4-Week PPL Program")
    .bind("Push/Pull/Legs split with progressive overload focus. 6 training days per week with Sunday rest.")
    .bind(4_i32)
    .bind(now - Duration::days(7))
    .bind(now - Duration::days(10))
    .execute(&mut **tx)
    .await?;

    // Get some completed workout IDs for week 1 slots
    let completed_workout_ids: Vec<Uuid> = sqlx::query_scalar(
        "SELECT id FROM workouts WHERE user_id = $1 AND status = 'completed' ORDER BY completed_at DESC LIMIT 6"
    )
    .bind(user_id)
    .fetch_all(&mut **tx)
    .await?;

    // Build 4 weeks of PPL schedule
    // Pattern: Mon=Push, Tue=Pull, Wed=Legs, Thu=Push, Fri=Pull, Sat=Legs, Sun=Rest
    let day_schedule: [(i32, &str, Option<Uuid>, bool); 7] = [
        (1, "Push Day", Some(push_id), false),
        (2, "Pull Day", Some(pull_id), false),
        (3, "Leg Day", Some(leg_id), false),
        (4, "Push Day", Some(push_id), false),
        (5, "Pull Day", Some(pull_id), false),
        (6, "Leg Day", Some(leg_id), false),
        (7, "Rest Day", None, true),
    ];

    for week in 1..=4 {
        for (day_num, name, template_id, is_rest_day) in &day_schedule {
            let workout_slot_id = Uuid::new_v4();

            // Week 1 workouts are completed (link to existing workout history)
            let (completed_workout_id, completed_at) = if week == 1 && !is_rest_day {
                // Map day slots to completed workouts from history
                let idx = (*day_num as usize - 1).min(completed_workout_ids.len().saturating_sub(1));
                if idx < completed_workout_ids.len() {
                    (Some(completed_workout_ids[idx]), Some(now - Duration::days(7 - *day_num as i64 + 1)))
                } else {
                    (None, None)
                }
            } else {
                (None, None)
            };

            sqlx::query(
                "INSERT INTO program_workouts (id, program_id, week_number, day_number, name, template_id, is_rest_day, completed_workout_id, completed_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
            )
            .bind(workout_slot_id)
            .bind(program_id)
            .bind(week)
            .bind(*day_num)
            .bind(*name)
            .bind(*template_id)
            .bind(*is_rest_day)
            .bind(completed_workout_id)
            .bind(completed_at)
            .execute(&mut **tx)
            .await?;
        }
    }

    // Create a second program (not active, completed)
    let program2_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO workout_programs (id, user_id, name, description, duration_weeks, is_active, current_week, current_day, started_at, completed_at, created_at)
         VALUES ($1, $2, $3, $4, $5, false, 2, 7, $6, $7, $8)"
    )
    .bind(program2_id)
    .bind(user_id)
    .bind("2-Week Starter Plan")
    .bind("Beginner-friendly introduction with 3 training days per week.")
    .bind(2_i32)
    .bind(now - Duration::days(30))
    .bind(now - Duration::days(16))
    .bind(now - Duration::days(35))
    .execute(&mut **tx)
    .await?;

    // Starter plan: Mon/Wed/Fri full body, rest on other days
    let starter_schedule: [(i32, &str, Option<Uuid>, bool); 7] = [
        (1, "Full Body A", Some(push_id), false),
        (2, "Rest Day", None, true),
        (3, "Full Body B", Some(pull_id), false),
        (4, "Rest Day", None, true),
        (5, "Full Body C", Some(leg_id), false),
        (6, "Rest Day", None, true),
        (7, "Rest Day", None, true),
    ];

    for week in 1..=2 {
        for (day_num, name, template_id, is_rest_day) in &starter_schedule {
            sqlx::query(
                "INSERT INTO program_workouts (id, program_id, week_number, day_number, name, template_id, is_rest_day)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)"
            )
            .bind(Uuid::new_v4())
            .bind(program2_id)
            .bind(week)
            .bind(*day_num)
            .bind(*name)
            .bind(*template_id)
            .bind(*is_rest_day)
            .execute(&mut **tx)
            .await?;
        }
    }

    Ok(())
}

async fn seed_user_settings(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
) -> Result<(), Box<dyn std::error::Error>> {
    // Plate calculator settings - demo user has a home gym with limited plates
    let plate_calculator_json = serde_json::json!({
        "selectedBarbell": "olympic",
        "customBarbellWeightKg": 20,
        "customBarbellWeightLbs": 45,
        "availablePlatesKg": [
            {"weight": 25, "available": false},  // No 25kg plates at home
            {"weight": 20, "available": true},
            {"weight": 15, "available": true},
            {"weight": 10, "available": true},
            {"weight": 5, "available": true},
            {"weight": 2.5, "available": true},
            {"weight": 1.25, "available": true}
        ],
        "availablePlatesLbs": [
            {"weight": 45, "available": true},
            {"weight": 35, "available": false},  // No 35lb plates
            {"weight": 25, "available": true},
            {"weight": 10, "available": true},
            {"weight": 5, "available": true},
            {"weight": 2.5, "available": true}
        ]
    });

    sqlx::query(
        "INSERT INTO user_settings (user_id, weight_unit, theme, default_rest_timer, auto_start_rest_timer, plate_calculator, compact_mode)
         VALUES ($1, 'kg', 'system', 90, true, $2, false)
         ON CONFLICT (user_id) DO UPDATE SET plate_calculator = $2, compact_mode = false"
    )
    .bind(user_id)
    .bind(&plate_calculator_json)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

async fn seed_admin_user(pool: &sqlx::PgPool) -> Result<(), Box<dyn std::error::Error>> {
    let password_hash = hash_password("admin1234")
        .map_err(|e| format!("Failed to hash password: {}", e))?;

    sqlx::query(
        "INSERT INTO users (id, email, password_hash, is_admin, created_at, updated_at)
         VALUES (gen_random_uuid(), 'admin@example.com', $1, true, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET is_admin = true"
    )
    .bind(&password_hash)
    .execute(pool)
    .await?;

    Ok(())
}

async fn seed_cardio_workouts(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
) -> Result<(), Box<dyn std::error::Error>> {
    // Workout 1: Morning Run
    let run_workout_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO workouts (id, user_id, name, started_at, completed_at, total_volume, total_sets, total_reps, duration, status)
         VALUES ($1, $2, 'Morning Run', NOW() - INTERVAL '3 days' - INTERVAL '30 minutes', NOW() - INTERVAL '3 days', 0, 2, 0, 1800, 'completed')"
    )
    .bind(run_workout_id)
    .bind(user_id)
    .execute(&mut **tx)
    .await?;

    let run_exercise_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO workout_exercises (id, workout_id, exercise_template_id, exercise_name, order_index)
         VALUES ($1, $2, 'ex-running', 'Running', 0)"
    )
    .bind(run_exercise_id)
    .bind(run_workout_id)
    .execute(&mut **tx)
    .await?;

    // Set 1: 5km easy run in 25 min
    sqlx::query(
        "INSERT INTO workout_sets (id, workout_exercise_id, set_number, is_warmup, is_completed, completed_at, distance_meters, duration_seconds, calories)
         VALUES ($1, $2, 1, false, true, NOW() - INTERVAL '3 days', 5000.0, 1500, 320)"
    )
    .bind(Uuid::new_v4())
    .bind(run_exercise_id)
    .execute(&mut **tx)
    .await?;

    // Set 2: 3km tempo in 15 min
    sqlx::query(
        "INSERT INTO workout_sets (id, workout_exercise_id, set_number, is_warmup, is_completed, completed_at, distance_meters, duration_seconds, calories)
         VALUES ($1, $2, 2, false, true, NOW() - INTERVAL '3 days', 3000.0, 900, 195)"
    )
    .bind(Uuid::new_v4())
    .bind(run_exercise_id)
    .execute(&mut **tx)
    .await?;

    // Workout 2: Cycling Session
    let cycle_workout_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO workouts (id, user_id, name, started_at, completed_at, total_volume, total_sets, total_reps, duration, status)
         VALUES ($1, $2, 'Cycling Session', NOW() - INTERVAL '7 days' - INTERVAL '45 minutes', NOW() - INTERVAL '7 days', 0, 3, 0, 2700, 'completed')"
    )
    .bind(cycle_workout_id)
    .bind(user_id)
    .execute(&mut **tx)
    .await?;

    let cycle_exercise_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO workout_exercises (id, workout_id, exercise_template_id, exercise_name, order_index)
         VALUES ($1, $2, 'ex-cycling', 'Cycling', 0)"
    )
    .bind(cycle_exercise_id)
    .bind(cycle_workout_id)
    .execute(&mut **tx)
    .await?;

    // Set 1: 15km warm-up pace in 35 min
    sqlx::query(
        "INSERT INTO workout_sets (id, workout_exercise_id, set_number, is_warmup, is_completed, completed_at, distance_meters, duration_seconds, calories)
         VALUES ($1, $2, 1, true, true, NOW() - INTERVAL '7 days', 15000.0, 2100, 280)"
    )
    .bind(Uuid::new_v4())
    .bind(cycle_exercise_id)
    .execute(&mut **tx)
    .await?;

    // Set 2: 20km main ride in 40 min
    sqlx::query(
        "INSERT INTO workout_sets (id, workout_exercise_id, set_number, is_warmup, is_completed, completed_at, distance_meters, duration_seconds, calories)
         VALUES ($1, $2, 2, false, true, NOW() - INTERVAL '7 days', 20000.0, 2400, 410)"
    )
    .bind(Uuid::new_v4())
    .bind(cycle_exercise_id)
    .execute(&mut **tx)
    .await?;

    // Set 3: 5km cool-down in 15 min
    sqlx::query(
        "INSERT INTO workout_sets (id, workout_exercise_id, set_number, is_warmup, is_completed, completed_at, distance_meters, duration_seconds, calories)
         VALUES ($1, $2, 3, false, true, NOW() - INTERVAL '7 days', 5000.0, 900, 95)"
    )
    .bind(Uuid::new_v4())
    .bind(cycle_exercise_id)
    .execute(&mut **tx)
    .await?;

    Ok(())
}
