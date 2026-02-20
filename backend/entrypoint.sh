#!/bin/sh
set -e

echo "Running seed (demo user setup)..."
seed && echo "Seed completed." || echo "Seed failed, continuing anyway..."

echo "Starting server..."
exec fitness_tracker_api
