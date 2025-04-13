#!/bin/bash

# Venue seeder runner script
# Usage: ./run-venue-seeder.sh [command] [argument]
#   Commands:
#     all [limit]     - Seed venues in all target cities, with optional limit
#     city [name]     - Seed venues in a specific city

echo "Running venue seeder with Google Maps API..."
npx tsx server/venue-seeder-google.ts "$@"
echo "Venue seeding completed."