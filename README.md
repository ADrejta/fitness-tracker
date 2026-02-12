# Fitness Tracker

A full-stack web application for tracking workouts, monitoring body stats, and analyzing fitness progress.

## Features

- **Workout Management** - Create, track, and complete workouts with exercises and sets
- **Exercise Library** - Browse default exercises or create custom ones
- **Workout Templates** - Save and reuse workout routines
- **Body Stats Tracking** - Monitor body measurements and set fitness goals
- **Statistics & Analytics** - View personal records, weekly volume, and muscle group distribution
- **Superset Support** - Group exercises into supersets
- **Plate Calculator** - Calculate barbell plate configurations

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
| `GET /body-stats/measurements` | List body measurements |
| `GET /statistics/summary` | Get stats summary |

## License

MIT
