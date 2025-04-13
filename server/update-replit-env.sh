#!/bin/bash

# Get the current DATABASE_URL
CURRENT_DB_URL=$(echo $DATABASE_URL)
echo "Current DATABASE_URL: $CURRENT_DB_URL"

# Check if it has the protocol issue
if [[ $CURRENT_DB_URL == postgres://postgresql//* ]]; then
  echo "Found protocol issue in DATABASE_URL, fixing..."
  
  # Fix the URL by removing the duplicate protocol
  FIXED_DB_URL=${CURRENT_DB_URL/postgres:\/\/postgresql:\/\//postgresql:\/\/}
  echo "Fixed DATABASE_URL: $FIXED_DB_URL"
  
  # Update .env file if it exists
  if [ -f .env ]; then
    echo "Updating .env file..."
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=$FIXED_DB_URL|g" .env
    echo "Added fixed DATABASE_URL to .env file"
  else
    echo "Creating .env file..."
    echo "DATABASE_URL=$FIXED_DB_URL" > .env
    echo "Created .env file with fixed DATABASE_URL"
  fi
  
  # Set the fixed URL as SUPABASE_CONNECTION_STRING if not already set
  if [ -z "$SUPABASE_CONNECTION_STRING" ]; then
    echo "Setting SUPABASE_CONNECTION_STRING in .env file..."
    echo "SUPABASE_CONNECTION_STRING=$FIXED_DB_URL" >> .env
    echo "Added SUPABASE_CONNECTION_STRING to .env file"
  fi
  
  echo "Environment variables updated in .env file"
  echo "You'll need to restart the application for changes to take effect"
else
  echo "DATABASE_URL format appears correct, no fix needed"
fi