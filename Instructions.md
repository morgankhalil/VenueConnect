
# Venue Data Seeding and Sync Implementation Plan

## Current Issues
1. Multiple redundant seeding scripts with overlapping functionality
2. Inconsistent error handling across scripts
3. No clear separation between initial seeding and ongoing sync
4. Foreign key constraint violations during seeding
5. Hard-coded venue IDs scattered across files

## Proposed Architecture

### 1. Core Seeding Module (server/core/seed-manager.ts)
- Single source of truth for initial data seeding
- Clear table dependencies and order
- Configurable filters for venues (capacity, location)
- Proper foreign key handling

### 2. Sync Module (server/core/sync-manager.ts)
- Handles ongoing data synchronization
- Rate limiting for API calls
- Proper error handling and logging
- Retry mechanisms for failed syncs

### 3. Implementation Steps

1. Consolidate Existing Scripts:
- Merge functionality from:
  - seed.ts
  - seed-events.ts
  - seed-bandsintown.ts
  - seed-venues-from-bandsintown.ts
  - seed-events-then-artists.ts

2. Create Clear Data Flow:
```
Initial Seed:
Venues -> Artists -> Events -> Venue Network

Ongoing Sync:
┌─ Venue Updates
├─ Artist Updates
└─ Event Updates
```

3. Add Proper Validation:
- Validate venue data before insertion
- Check for existing records
- Handle API rate limits
- Proper error handling

4. Implement Retry Logic:
- Exponential backoff for API calls
- Skip failed items and continue processing
- Log failures for manual review

## Table Clearing Order
1. events
2. tourVenues
3. tours
4. venueNetwork
5. artists
6. venues
7. users

## API Integration
- Move API keys to environment variables
- Implement proper rate limiting
- Add request caching
- Error handling with retries

Would you like me to start implementing any specific part of this plan?
