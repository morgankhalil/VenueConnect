
# Bandsintown API Integration Issue

## Current Problem
- Getting 403 Forbidden response from Bandsintown API
- This indicates an authentication issue with the API key

## Diagnosis
1. The API calls are failing with a 403 status code
2. This typically means either:
   - The API key is not set
   - The API key is invalid
   - The API key doesn't have sufficient permissions

## Solution Steps

1. First, verify the API key is set:
   - Check if BANDSINTOWN_API_KEY exists in your environment variables
   - You can do this through the Replit Secrets tool (lock icon in sidebar)

2. If the key is not set:
   - Go to the Replit Secrets tool
   - Add a new secret with key "BANDSINTOWN_API_KEY"
   - Get your API key from Bandsintown's developer portal
   - Paste your API key as the value

3. If the key is set but still getting 403:
   - Verify the API key is valid on Bandsintown's developer portal
   - Check if your API key has the correct permissions
   - Try generating a new API key if needed

4. After setting up the API key:
   - Restart the server
   - Try running the venue sync again

## Testing
Once the API key is properly configured, run:
```bash
npx tsx server/seed-venues-from-bandsintown.ts
```

This should now successfully connect to the Bandsintown API without the 403 error.

# PredictHQ Integration Plan

## Current Codebase Analysis

### Relevant Files
1. `server/data-sync/event-provider.ts` - Contains the EventProvider interface
2. `server/data-sync/predict-hq-provider.ts` - New PredictHQ implementation
3. `server/data-sync/bands-in-town-sync.ts` - Existing Bandsintown integration

### Integration Status
- Basic PredictHQ provider implementation is in place
- Need to implement data mapping and sync logic

## Implementation Plan

### 1. Data Mapping Tasks
- Map PredictHQ event fields to our database schema
- Handle venue matching and creation
- Add support for PredictHQ-specific fields

### 2. Sync Runner Updates
- Update sync-runner.ts to support both providers
- Add provider selection logic
- Implement rate limiting for free trial limitations

### 3. Testing Plan
1. Test venue search functionality
2. Test event fetching with pagination
3. Verify data mapping accuracy
4. Test error handling and retry logic

### 4. Migration Strategy
1. Run both providers in parallel initially
2. Validate data quality from PredictHQ
3. Gradually transition to PredictHQ as primary source
