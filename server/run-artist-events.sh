#!/bin/bash
# Run the artist events test script

# Default parameters
ARTIST_NAME=${1:-"La Luz"}

echo "Running artist events test for artist: $ARTIST_NAME..."

cd "$(dirname "$0")/.."
npx tsx server/test-artist-events.ts "$ARTIST_NAME"