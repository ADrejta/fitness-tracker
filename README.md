# Fitness Tracker

A full-stack web application for tracking workouts, monitoring body stats, and analyzing fitness progress.

## Features

- **Workout Management** - Create, track, and complete workouts with exercises and sets
- **Exercise Library** - Browse default exercises or create custom ones
- **Workout Templates** - Save and reuse workout routines
- **Workout Programs** - Create multi-week training plans (e.g., PPL splits), track progress through weekly schedules, and start workouts directly from program slots
- **Body Stats Tracking** - Monitor body measurements and set fitness goals with progress tracking
- **Statistics & Analytics** - View personal records, weekly volume, muscle group distribution, and exercise progress over time
- **Superset Support** - Group exercises into supersets within workouts and templates
- **Plate Calculator** - Calculate barbell plate configurations with customizable available plates

## Tech Stack

### Backend
- **Rust** with Axum web framework
- **PostgreSQL** database with SQLx
- **JWT** authentication with Argon2 password hashing

### Frontend
- **Angular 17** with TypeScript
- **SCSS** for styling
- **Chart.js** for data visualization

## Project Structure

```
fitness-tracker/
├── backend/           # Rust API server
│   ├── src/
│   │   ├── handlers/  # HTTP request handlers
│   │   ├── models/    # Domain models
│   │   ├── repositories/  # Data access layer
│   │   └── services/  # Business logic
│   └── migrations/    # SQL migrations
└── frontend/          # Angular application
    └── src/
        └── app/
            ├── core/      # Services, guards, interceptors
            ├── features/  # Feature components
            └── shared/    # Reusable components
```

## Getting Started

### Prerequisites

- Rust 1.70+
- Node.js 18+
- Docker & Docker Compose

### Backend Setup

```bash
cd backend

# Copy environment config
cp .env.example .env

# Start PostgreSQL
docker-compose up -d

# Run the server (migrations run automatically)
cargo run
```

The API will be available at `http://localhost:3000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The application will be available at `http://localhost:4200`

### Demo Data

Seed the database with a fully-featured demo user:

```bash
cd backend
cargo run --bin seed           # create demo user with sample data
cargo run --bin seed -- --force # reset and re-seed demo data
```

Login with `demo@example.com` / `demo1234` to explore all features with pre-populated workout history, templates, programs, body stats, goals, and personal records.

## Configuration

### Backend Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE__URL` | PostgreSQL connection string |
| `JWT__SECRET` | Secret key for JWT signing |
| `SERVER__PORT` | Server port (default: 3000) |
| `CORS__ALLOWED_ORIGINS` | Allowed CORS origins |

See `backend/.env.example` for all options.

## API Overview

Base URL: `/api/v1`

| Endpoint | Description |
|----------|-------------|
| `POST /auth/register` | User registration |
| `POST /auth/login` | User login |
| `GET /workouts` | List workouts |
| `POST /workouts` | Create workout |
| `GET /exercises` | List exercises |
| `GET /templates` | List workout templates |
| `GET /programs` | List workout programs |
| `POST /programs` | Create a workout program |
| `POST /programs/{id}/start` | Activate a program |
| `GET /programs/active` | Get active program |
| `GET /body-stats/measurements` | List body measurements |
| `GET /body-stats/goals` | List body stats goals |
| `GET /statistics/summary` | Get stats summary |
| `GET /personal-records` | Get personal records |

## License

MIT
