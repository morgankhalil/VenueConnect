
# Assistant Documentation Maintenance Prompt

When working with this codebase, please follow these guidelines:

1. Documentation Consistency
- Always check and reference these key files:
  - EXECUTIVE_SUMMARY.md - Platform vision and goals
  - FEATURE_IMPLEMENTATION_PLAN.md - Implementation phases
  - FEATURE_IMPLEMENTATION_INSTRUCTIONS.md - Technical guides
  - IMPLEMENTATION_TASK_TRACKER.md - Progress tracking

2. Feature Development Process
- For each new feature or change:
  a. Verify alignment with EXECUTIVE_SUMMARY.md vision
  b. Identify the relevant phase in FEATURE_IMPLEMENTATION_PLAN.md
  c. Follow patterns in FEATURE_IMPLEMENTATION_INSTRUCTIONS.md
  d. Update status in IMPLEMENTATION_TASK_TRACKER.md

3. Code Organization Rules
- Place database models in shared/schema.ts
- Backend business logic goes in server/services/
- Reusable utilities belong in shared/utils/
- Frontend components go in client/src/components/
- Follow existing naming conventions and patterns

4. Implementation Guidelines
- Maintain consistent error handling patterns
- Follow the established API structure
- Use existing UI components from client/src/components/ui/
- Keep documentation updated with code changes

5. Testing Requirements
- Add unit tests for new algorithms
- Include integration tests for API endpoints
- Update test documentation as needed

6. Documentation Updates
- Any new feature must include:
  - Technical documentation in FEATURE_IMPLEMENTATION_INSTRUCTIONS.md
  - Implementation details in FEATURE_IMPLEMENTATION_PLAN.md
  - Progress tracking in IMPLEMENTATION_TASK_TRACKER.md
  - Vision alignment in EXECUTIVE_SUMMARY.md if needed

When you receive a request, please:
1. Check if it aligns with existing documentation
2. Propose necessary documentation updates
3. Implement the requested changes
4. Update relevant tracking information


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
1. Venues         (Base venue data)
2. Venue Events   (Events at each venue)
3. Event Artists  (Artists from those events)
4. Venue Network  (Connect similar venues)

Ongoing Sync:
┌─ Venue Updates
├─ Venue Event Updates
└─ Event Artist Updates
```

The flow is designed this way because:
- Venues are our primary data point
- Events belong to venues and provide context
- Artists are extracted from events
- Venue network is built based on shared artists/events

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
# Collaborative Development Prompt Template

When working together on this codebase, please keep in mind these key documentation files that need to be kept in sync with any changes or new features:

1. EXECUTIVE_SUMMARY.md - High-level vision and goals
   - Platform vision and strategic goals
   - Key features overview
   - Value propositions
   - Implementation timeline

2. FEATURE_IMPLEMENTATION_PLAN.md - Implementation phases
   - Detailed phase breakdowns
   - Technical requirements
   - Dependencies and architecture
   - Testing strategy

3. FEATURE_IMPLEMENTATION_INSTRUCTIONS.md - Technical documentation
   - Database schema updates
   - API endpoint specifications
   - Component implementation details
   - Integration guidelines

4. IMPLEMENTATION_TASK_TRACKER.md - Progress tracking
   - Prioritized task list
   - Implementation status
   - Dependencies
   - Effort estimates

## Development Process

1. Any new feature discussion should start by checking alignment with EXECUTIVE_SUMMARY.md
2. Implementation details should be added to FEATURE_IMPLEMENTATION_PLAN.md
3. Technical specifications should be documented in FEATURE_IMPLEMENTATION_INSTRUCTIONS.md
4. Track progress and update status in IMPLEMENTATION_TASK_TRACKER.md

## Prompt Template

"I am working on [feature/change]. Please help me implement it while ensuring consistency with our documentation:

1. Check if this aligns with our vision in EXECUTIVE_SUMMARY.md
2. Identify which phase in FEATURE_IMPLEMENTATION_PLAN.md this belongs to
3. Follow technical guidelines in FEATURE_IMPLEMENTATION_INSTRUCTIONS.md
4. Update tasks and progress in IMPLEMENTATION_TASK_TRACKER.md

Please propose necessary updates to these files along with any code changes."
