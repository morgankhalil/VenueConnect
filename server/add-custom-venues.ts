import { db } from './db';
import { venues } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Add custom venues to the database
 * This script adds additional venues with accurate geographic data
 */
async function addCustomVenues() {
  console.log('Adding custom venues to the database...');

  const venueData = [
    {
      name: 'The Fillmore',
      city: 'San Francisco',
      region: 'CA',
      country: 'USA',
      latitude: 37.7842,
      longitude: -122.4324,
      capacity: 1150,
      description: 'Historic music venue in San Francisco',
      website: 'https://www.livenation.com/venue/fillmore-san-francisco',
      contactEmail: 'fillmore@example.com'
    },
    {
      name: 'Brooklyn Steel',
      city: 'Brooklyn',
      region: 'NY',
      country: 'USA',
      latitude: 40.7168,
      longitude: -73.9369,
      capacity: 1800,
      description: 'Modern concert venue in Brooklyn',
      website: 'https://www.brooklynsteel.com',
      contactEmail: 'info@brooklynsteel.com'
    },
    {
      name: 'First Avenue',
      city: 'Minneapolis',
      region: 'MN',
      country: 'USA',
      latitude: 44.9784,
      longitude: -93.2765,
      capacity: 1500,
      description: 'Iconic Minneapolis music club featured in Purple Rain',
      website: 'https://first-avenue.com',
      contactEmail: 'info@first-avenue.com'
    },
    {
      name: 'The Ryman Auditorium',
      city: 'Nashville',
      region: 'TN',
      country: 'USA',
      latitude: 36.1614,
      longitude: -86.7783,
      capacity: 2362,
      description: 'Historic former home of the Grand Ole Opry',
      website: 'https://www.ryman.com',
      contactEmail: 'info@ryman.com'
    },
    {
      name: 'Red Rocks Amphitheatre',
      city: 'Morrison',
      region: 'CO',
      country: 'USA',
      latitude: 39.6655,
      longitude: -105.2059,
      capacity: 9545,
      description: 'Natural rock structure amphitheater near Denver',
      website: 'https://www.redrocksonline.com',
      contactEmail: 'redrocks@denver.gov'
    },
    {
      name: 'The Troubadour',
      city: 'Los Angeles',
      region: 'CA',
      country: 'USA',
      latitude: 34.0816,
      longitude: -118.3893,
      capacity: 500,
      description: 'Historic club that helped launch many music careers',
      website: 'https://www.troubadour.com',
      contactEmail: 'info@troubadour.com'
    },
    {
      name: 'Lincoln Hall',
      city: 'Chicago',
      region: 'IL',
      country: 'USA',
      latitude: 41.9275,
      longitude: -87.6488,
      capacity: 507,
      description: 'Intimate music venue in Chicago',
      website: 'https://www.lh-st.com',
      contactEmail: 'info@lh-st.com'
    },
    {
      name: 'The Independent',
      city: 'San Francisco',
      region: 'CA',
      country: 'USA',
      latitude: 37.7754,
      longitude: -122.4376,
      capacity: 500,
      description: 'Prominent indie music venue in San Francisco',
      website: 'https://www.theindependentsf.com',
      contactEmail: 'info@theindependentsf.com'
    }
  ];

  for (const venue of venueData) {
    // Check if venue already exists
    const existingVenue = await db.select()
      .from(venues)
      .where(eq(venues.name, venue.name))
      .limit(1);
    
    if (existingVenue.length > 0) {
      console.log(`Venue already exists: ${venue.name} (ID: ${existingVenue[0].id})`);
    } else {
      // Create new venue
      const [newVenue] = await db.insert(venues).values(venue).returning();
      console.log(`Added venue: ${newVenue.name} (ID: ${newVenue.id})`);
    }
  }

  console.log('Finished adding custom venues');
}

// Run the function
addCustomVenues()
  .then(() => {
    console.log('Custom venue addition completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error adding custom venues:', error);
    process.exit(1);
  });