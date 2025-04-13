#!/bin/bash
# Run the chain data collector test script

# Default parameters
ENTITY_TYPE=${1:-"venue"}
ENTITY_NAME=${2:-"House of Blues Boston"}

echo "Running chain collector test with $ENTITY_TYPE: $ENTITY_NAME..."

cd "$(dirname "$0")/.."
npx tsx server/test-chain-collector.ts "$ENTITY_TYPE" "$ENTITY_NAME"