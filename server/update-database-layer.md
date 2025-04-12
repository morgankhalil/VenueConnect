# Database Layer Standardization

## Current Status
We currently have two ways to store and query genre relationships:

1. **Array Columns**: 
   - `artists.genres`
   - `venues.primaryGenre`
   - `venues.secondaryGenres`

2. **Junction Tables**:
   - `artistGenres`
   - `venueGenres`

After our migration, all entities have data in both formats, but there are inconsistencies between them.

## Standardization Plan

### 1. Phase Out Array Columns

#### Step 1: Update All Read Operations
- Replace any queries that read from array columns to use junction tables instead
- Use helper functions from `server/helpers/genre-utils.ts`

**Example:**
```typescript
// OLD WAY
const artistWithGenres = await db
  .select()
  .from(artists)
  .where(eq(artists.id, artistId));
// Using array: artistWithGenres.genres

// NEW WAY
import { getArtistGenres } from './helpers/genre-utils';
const artistGenres = await getArtistGenres(artistId);
```

#### Step 2: Update All Write Operations
- Replace any operations that write to array columns to use junction tables instead
- Use helper functions from `server/helpers/genre-utils.ts`

**Example:**
```typescript
// OLD WAY
await db
  .update(artists)
  .set({ genres: ['rock', 'indie'] })
  .where(eq(artists.id, artistId));

// NEW WAY
import { setArtistGenres } from './helpers/genre-utils';
const genreIds = [rockGenreId, indieGenreId];
await setArtistGenres(artistId, genreIds);
```

### 2. Implement Data Access Layer

To enforce consistent data access patterns:

1. Ensure all code uses the helper functions for genre operations
2. Update relevant API endpoints to return genre data from junction tables
3. Create specialized endpoints for genre filtering and manipulation

### 3. Future Schema Update (Optional)

After the transition is complete and all code has been updated to use the junction tables, we could consider:

1. Marking the array columns as deprecated in schema
2. Eventually removing the array columns in a future migration

## Files to Update

1. **Routes that filter or retrieve by genres:**
   - `server/routes/search.ts`
   - `server/routes/search-new.ts`
   - `server/routes/artist-routes.ts`
   - `server/routes/venue-routes.ts`

2. **Any genre-specific operations:**
   - `server/seed-artists.ts`
   - `server/scrape-venue-events.ts`
   - `server/test-concerts-api.ts`

## Benefits

- Single source of truth for genre relationships
- More flexible data model (junction tables can store additional metadata)
- Better query performance for complex genre-related operations
- More explicit data access patterns via helper functions