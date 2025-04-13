#!/bin/bash

# Script to run the chained data collector
echo "Running chained data collector..."

# Get command line arguments
MODE=${1:-"full"}  # Default to full collection
ENTITY=${2:-""}    # Entity name for test mode
LIMIT=${3:-5}      # Default limit for venues/artists

case $MODE in
  "full")
    echo "Running full chained data collection with limit of $LIMIT..."
    npx tsx server/chain-scraper.ts $LIMIT
    ;;
  "venue")
    if [ -z "$ENTITY" ]; then
      echo "Error: Venue name required for venue mode."
      echo "Usage: ./run-data-collector.sh venue \"Venue Name\""
      exit 1
    fi
    echo "Testing venue scraping for: $ENTITY"
    npx tsx server/test-venue-scraper.ts "$ENTITY"
    ;;
  "artist")
    if [ -z "$ENTITY" ]; then
      echo "Error: Artist name required for artist mode."
      echo "Usage: ./run-data-collector.sh artist \"Artist Name\""
      exit 1
    fi
    echo "Testing artist data collection for: $ENTITY"
    npx tsx server/test-chain-collector.ts artist "$ENTITY"
    ;;
  *)
    echo "Unknown mode: $MODE"
    echo "Supported modes: full, venue, artist"
    echo "Usage: ./run-data-collector.sh [mode] [entity_name] [limit]"
    exit 1
    ;;
esac

echo "Data collection completed."