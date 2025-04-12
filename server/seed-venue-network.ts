import { db } from './db';
import { venues, venueNetwork } from '../shared/schema';
import { and, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm';

/**
 * Seed the venue network with connections between venues based on compatibility
 * This creates a network of venue connections based on:
 * 1. Geographic proximity
 * 2. Compatible venue size
 * 3. Similar genre focus
 */
async function seedVenueNetwork() {
  try {
    console.log('Starting venue network seeding...');
    
    // Clear existing venue network connections
    await db.delete(venueNetwork);
    console.log('Cleared existing venue network connections');
    
    // Get all venues with valid coordinates
    const allVenues = await db.query.venues.findMany({
      where: and(
        isNotNull(venues.latitude),
        isNotNull(venues.longitude)
      )
    });
    
    console.log(`Found ${allVenues.length} venues with valid coordinates`);
    
    if (allVenues.length === 0) {
      console.log('No venues found to create connections');
      return;
    }
    
    // Track number of connections created
    let connectionCount = 0;
    const connections = [];
    
    // Create connections between compatible venues
    for (let i = 0; i < allVenues.length; i++) {
      const venue = allVenues[i];
      
      // Skip venues without coordinates
      if (!venue.latitude || !venue.longitude) continue;
      
      // Find compatible venues
      for (let j = i + 1; j < allVenues.length; j++) {
        const otherVenue = allVenues[j];
        
        // Skip venues without coordinates
        if (!otherVenue.latitude || !otherVenue.longitude) continue;
        
        // Calculate compatibility score based on different factors
        let compatibilityScore = 0;
        
        // 1. Geographic proximity (using Haversine formula)
        const distance = calculateDistance(
          venue.latitude,
          venue.longitude,
          otherVenue.latitude,
          otherVenue.longitude
        );
        
        // Add connections for venues that are relatively close (within 500km)
        if (distance < 500) {
          compatibilityScore += (500 - distance) / 5; // Higher score for closer venues
        } else {
          continue; // Skip venues that are too far apart
        }
        
        // 2. Similar size category
        if (venue.capacityCategory === otherVenue.capacityCategory) {
          compatibilityScore += 20;
        } else if (
          // Adjacent size categories (small - medium, medium - large)
          (venue.capacityCategory === 'small' && otherVenue.capacityCategory === 'medium') ||
          (venue.capacityCategory === 'medium' && otherVenue.capacityCategory === 'small') ||
          (venue.capacityCategory === 'medium' && otherVenue.capacityCategory === 'large') ||
          (venue.capacityCategory === 'large' && otherVenue.capacityCategory === 'medium')
        ) {
          compatibilityScore += 10;
        }
        
        // 3. Similar genre focus
        if (venue.primaryGenre === otherVenue.primaryGenre) {
          compatibilityScore += 20;
        }
        
        // 4. Same market category
        if (venue.marketCategory === otherVenue.marketCategory) {
          compatibilityScore += 15;
        }
        
        // 5. Same venue type
        if (venue.venueType === otherVenue.venueType) {
          compatibilityScore += 15;
        }
        
        // Only create connections if venues are compatible enough
        if (compatibilityScore >= 30) {
          // Convert compatibility score to trust score (50-100)
          const trustScore = Math.min(Math.floor(50 + compatibilityScore / 2), 95);
          
          // Simulate some collaborative bookings based on compatibility
          const collaborativeBookings = Math.floor(compatibilityScore / 20);
          
          // Add connection to the batch
          connections.push({
            venueId: venue.id,
            connectedVenueId: otherVenue.id,
            status: 'active',
            trustScore,
            collaborativeBookings,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // Add reverse connection (bidirectional network)
          connections.push({
            venueId: otherVenue.id,
            connectedVenueId: venue.id,
            status: 'active',
            trustScore,
            collaborativeBookings,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          connectionCount += 2;
        }
      }
    }
    
    // Insert connections in batches
    if (connections.length > 0) {
      const result = await db.insert(venueNetwork).values(connections);
      
      console.log(`Created ${connectionCount} venue network connections`);
    } else {
      console.log('No connections were generated based on compatibility criteria');
    }
    
    console.log('Venue network seeding completed successfully');
  } catch (error) {
    console.error('Error seeding venue network:', error);
  }
}

/**
 * Calculate the distance between two points on Earth in kilometers
 * Uses the Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Run the seeding function
seedVenueNetwork()
  .then(() => process.exit())
  .catch((err) => {
    console.error('Error in venue network seeding script:', err);
    process.exit(1);
  });