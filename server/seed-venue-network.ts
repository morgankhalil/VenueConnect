import { db } from "./db";
import { venues, venueNetwork } from "../shared/schema";
import { eq, and, not, isNotNull, sql } from "drizzle-orm";

/**
 * Seed the venue network with initial connections
 * This script creates logical connections between venues based on 
 * location, capacity, and market category
 */
async function seedVenueNetwork() {
  console.log("Starting venue network seeding...");
  
  try {
    // Get all venues with valid coordinates
    const allVenues = await db
      .select()
      .from(venues)
      .where(
        and(
          isNotNull(venues.latitude),
          isNotNull(venues.longitude)
        )
      );
    
    if (allVenues.length <= 1) {
      console.log("Need at least 2 venues to create connections");
      return;
    }
    
    console.log(`Found ${allVenues.length} venues to create network connections`);
    
    // Clear existing connections (optional - comment out if you want to keep existing connections)
    await db.delete(venueNetwork);
    console.log("Cleared existing venue network connections");
    
    let connectionsCreated = 0;
    
    // Create connections based on proximity
    for (let i = 0; i < allVenues.length; i++) {
      const venue1 = allVenues[i];
      
      // We'll connect each venue to up to 5 other venues
      let connections = 0;
      const maxConnections = 5;
      
      // Calculate distances to all other venues
      const venuesWithDistances = [];
      
      for (let j = 0; j < allVenues.length; j++) {
        if (i === j) continue; // Skip self
        
        const venue2 = allVenues[j];
        
        // Calculate distance between venues
        const distance = calculateDistance(
          Number(venue1.latitude),
          Number(venue1.longitude),
          Number(venue2.latitude),
          Number(venue2.longitude)
        );
        
        venuesWithDistances.push({
          venue: venue2,
          distance
        });
      }
      
      // Sort by distance (closest first)
      venuesWithDistances.sort((a, b) => a.distance - b.distance);
      
      // Connect to closest venues, with some category-based rules
      for (const { venue: venue2, distance } of venuesWithDistances) {
        if (connections >= maxConnections) break;
        
        // Skip if distance is more than 250 miles for primary markets, 
        // 150 miles for secondary, 100 miles for tertiary
        let maxDistance = 250;
        if (venue1.marketCategory === 'secondary') maxDistance = 150;
        if (venue1.marketCategory === 'tertiary') maxDistance = 100;
        
        if (distance > maxDistance) continue;
        
        // Calculate trust score based on distance and market category
        let trustScore = 100 - (distance / maxDistance) * 50;
        
        // Venues in the same market category have higher trust
        if (venue1.marketCategory === venue2.marketCategory) {
          trustScore += 10;
        }
        
        // Similar capacity venues have higher trust
        if (venue1.capacityCategory === venue2.capacityCategory) {
          trustScore += 10;
        }
        
        // Ensure trust score stays within bounds
        trustScore = Math.min(Math.max(trustScore, 50), 95);
        
        // Calculate collaborative bookings (random for now)
        const collaborativeBookings = Math.floor(Math.random() * 10) + 1;
        
        // Create connection
        await db.insert(venueNetwork).values({
          venueId: venue1.id,
          connectedVenueId: venue2.id,
          status: 'active',
          trustScore: Math.round(trustScore),
          collaborativeBookings
        });
        
        connectionsCreated++;
        connections++;
      }
    }
    
    console.log(`Created ${connectionsCreated} venue network connections`);
  } catch (error) {
    console.error("Error seeding venue network:", error);
    throw error;
  }
}

/**
 * Calculate distance between two coordinates in miles using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

// Execute the script
seedVenueNetwork()
  .catch(error => {
    console.error("Venue network seeding failed:", error);
    process.exit(1);
  })
  .finally(() => {
    console.log("Venue network seeding completed");
    process.exit(0);
  });