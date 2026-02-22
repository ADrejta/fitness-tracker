#!/bin/sh
set -e

if [ "${RUN_SEED:-false}" = "true" ]; then
    echo "Running seed (demo user setup)..."
    seed && echo "Seed completed." || echo "Seed failed, continuing anyway..."
fi

echo "Starting server..."
exec fitness_tracker_api
