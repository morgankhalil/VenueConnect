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
- Utilize unified optimization approach for tour planning
- Follow established data sync patterns for venue updates

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

# Data Management and Seeding

## Table Clearing Order
When clearing database tables, follow this specific order to maintain referential integrity:
1. events
2. tourVenues
3. tours
4. venueNetwork
5. artists
6. users
7. venues

## Seeding Process
The standard seeding workflow uses the "Seed Sample Data" workflow which:
1. Clears all tables in the correct order
2. Seeds fresh data from the Concerts API
3. Additional data can be added using specific seeding scripts as needed

## API Integration
- Store API keys in environment variables
- Implement proper rate limiting
- Add request caching
- Use error handling with retries

Would you like me to implement any specific part of this updated documentation?

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