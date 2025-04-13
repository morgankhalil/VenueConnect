#!/bin/bash

# Venue data enhancer runner script
# Usage: ./run-venue-enhancer.sh [command] [argument]
#   Commands:
#     all [limit]     - Enhance all venues, with optional limit
#     venue [name]    - Enhance a specific venue by name

echo "Running venue data enhancer..."
npx tsx server/venue-data-enhancer.ts "$@"
echo "Data enhancement completed."