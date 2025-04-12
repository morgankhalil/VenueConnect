/**
 * Genre Utilities
 * 
 * A set of helper functions to standardize how we interact with genres throughout the application.
 * These utilities enforce the use of junction tables as the primary storage for genre relationships.
 */

import { db } from '../db';
import { artists, venues, genres, artistGenres, venueGenres } from '../../shared/schema';
import { eq, inArray, sql, desc } from 'drizzle-orm';

/**
 * Get all genres for an artist using the junction table
 */
export async function getArtistGenres(artistId: number) {
  return db
    .select({
      id: genres.id,
      name: genres.name,
      slug: genres.slug,
      parentId: genres.parentId,
    })
    .from(artistGenres)
    .innerJoin(genres, eq(artistGenres.genreId, genres.id))
    .where(eq(artistGenres.artistId, artistId));
}

/**
 * Get all artists that have a specific genre
 */
export async function getArtistsByGenre(genreId: number) {
  return db
    .select({
      id: artists.id,
      name: artists.name,
      imageUrl: artists.imageUrl,
      popularity: artists.popularity,
    })
    .from(artistGenres)
    .innerJoin(artists, eq(artistGenres.artistId, artists.id))
    .where(eq(artistGenres.genreId, genreId));
}

/**
 * Get all genres for a venue using the junction table
 */
export async function getVenueGenres(venueId: number) {
  return db
    .select({
      id: genres.id,
      name: genres.name,
      slug: genres.slug,
      parentId: genres.parentId,
      isPrimary: venueGenres.isPrimary,
    })
    .from(venueGenres)
    .innerJoin(genres, eq(venueGenres.genreId, genres.id))
    .where(eq(venueGenres.venueId, venueId));
}

/**
 * Get the primary genre for a venue using the junction table
 */
export async function getVenuePrimaryGenre(venueId: number) {
  const result = await db
    .select({
      id: genres.id,
      name: genres.name,
      slug: genres.slug,
    })
    .from(venueGenres)
    .innerJoin(genres, eq(venueGenres.genreId, genres.id))
    .where(eq(venueGenres.venueId, venueId))
    .where(eq(venueGenres.isPrimary, true))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get all venues that have a specific genre
 */
export async function getVenuesByGenre(genreId: number, primaryOnly: boolean = false) {
  let query = db
    .select({
      id: venues.id,
      name: venues.name,
      city: venues.city,
      region: venues.region,
      isPrimary: venueGenres.isPrimary,
    })
    .from(venueGenres)
    .innerJoin(venues, eq(venueGenres.venueId, venues.id))
    .where(eq(venueGenres.genreId, genreId));

  if (primaryOnly) {
    query = query.where(eq(venueGenres.isPrimary, true));
  }

  return query;
}

/**
 * Set genres for an artist using the junction table
 * This replaces all existing genre relationships for the artist
 */
export async function setArtistGenres(artistId: number, genreIds: number[]) {
  // First, remove existing genre associations
  await db
    .delete(artistGenres)
    .where(eq(artistGenres.artistId, artistId));

  // Then add the new ones
  if (genreIds.length > 0) {
    const values = genreIds.map(genreId => ({
      artistId,
      genreId
    }));

    await db
      .insert(artistGenres)
      .values(values);
  }

  return genreIds.length;
}

/**
 * Set genres for a venue using the junction table
 * This replaces all existing genre relationships for the venue
 */
export async function setVenueGenres(
  venueId: number, 
  primaryGenreId: number | null, 
  secondaryGenreIds: number[] = []
) {
  // First, remove existing genre associations
  await db
    .delete(venueGenres)
    .where(eq(venueGenres.venueId, venueId));

  // Then add the new ones
  const values = [];

  if (primaryGenreId) {
    values.push({
      venueId,
      genreId: primaryGenreId,
      isPrimary: true
    });
  }

  secondaryGenreIds.forEach(genreId => {
    values.push({
      venueId,
      genreId,
      isPrimary: false
    });
  });

  if (values.length > 0) {
    await db
      .insert(venueGenres)
      .values(values);
  }

  return values.length;
}

/**
 * Get genre by ID
 */
export async function getGenreById(genreId: number) {
  const result = await db
    .select()
    .from(genres)
    .where(eq(genres.id, genreId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get genre by name
 */
export async function getGenreByName(name: string) {
  const normalizedName = name.toLowerCase().trim();
  const result = await db
    .select()
    .from(genres)
    .where(sql`LOWER(${genres.name}) = ${normalizedName}`)
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get genre by slug
 */
export async function getGenreBySlug(slug: string) {
  const normalizedSlug = slug.toLowerCase().trim();
  const result = await db
    .select()
    .from(genres)
    .where(eq(genres.slug, normalizedSlug))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get all child genres for a parent genre
 */
export async function getChildGenres(parentId: number) {
  return db
    .select()
    .from(genres)
    .where(eq(genres.parentId, parentId));
}

/**
 * Get subgenres including the parent
 */
export async function getGenreWithChildren(genreId: number) {
  const genre = await getGenreById(genreId);
  if (!genre) return [];

  const children = await getChildGenres(genreId);
  return [genre, ...children];
}

/**
 * Get genres by IDs
 */
export async function getGenresByIds(genreIds: number[]) {
  if (genreIds.length === 0) return [];
  
  return db
    .select()
    .from(genres)
    .where(inArray(genres.id, genreIds));
}

/**
 * Find related genres based on artist overlap
 * Returns genres that share artists with the specified genre
 */
export async function findRelatedGenresByArtistOverlap(genreId: number, limit: number = 5) {
  // Get artists with this genre
  const artistsWithGenre = await db
    .select({ artistId: artistGenres.artistId })
    .from(artistGenres)
    .where(eq(artistGenres.genreId, genreId));

  if (artistsWithGenre.length === 0) return [];
  
  const artistIds = artistsWithGenre.map(a => a.artistId);

  // Find other genres these artists have
  const relatedGenres = await db
    .select({
      id: genres.id,
      name: genres.name,
      slug: genres.slug,
      overlapCount: sql<number>`COUNT(${artistGenres.artistId})`.as('overlapCount')
    })
    .from(artistGenres)
    .innerJoin(genres, eq(artistGenres.genreId, genres.id))
    .where(inArray(artistGenres.artistId, artistIds))
    .where(sql`${artistGenres.genreId} != ${genreId}`)
    .groupBy(genres.id, genres.name, genres.slug)
    .orderBy(desc(sql<number>`COUNT(${artistGenres.artistId})`))
    .limit(limit);
    
  // Map the result to the desired format with the correct property names
  return relatedGenres.map(genre => ({
    id: genre.id,
    name: genre.name,
    slug: genre.slug,
    overlap: genre.overlapCount ? Number(genre.overlapCount) : 0
  }));
}