import { db } from './db';
import { users, venues, venueNetwork, tourVenues } from '../shared/schema';
//Added import statements for events, tours and artists tables
import { events, tours, artists } from '../shared/schema';

async function seed() {
  try {
    // Clear all existing data in correct order
    console.log('Clearing existing data...');
    // First clear junction tables and dependent tables
    await db.delete(venueNetwork);
    await db.delete(tourVenues);
    await db.delete(events);
    await db.delete(tours);
    await db.delete(artists);
    // Then clear main tables
    await db.delete(venues);
    await db.delete(users);
    console.log('Database cleared successfully');

    // Create venue manager user
    const [venueManager] = await db.insert(users).values({
      username: 'manager',
      password: 'venue123',
      name: 'Venue Manager',
      email: 'manager@venues.com',
      role: 'venue_manager'
    }).returning();

    // Real venues data with Bandsintown IDs
    const venueDataList = [
      {
        name: 'The Bowery Ballroom',
        address: '6 Delancey St',
        city: 'New York',
        state: 'NY',
        zipCode: '10002',
        country: 'USA',
        capacity: 575,
        latitude: 40.7204,
        longitude: -73.9934,
        description: 'Historic Manhattan venue known for indie rock shows',
        ownerId: venueManager.id,
        bandsintownId: '1847-the-bowery-ballroom'
      },
      {
        name: 'The 9:30 Club',
        address: '815 V St NW',
        city: 'Washington',
        state: 'DC',
        zipCode: '20001',
        country: 'USA',
        capacity: 1200,
        latitude: 38.9178,
        longitude: -77.0230,
        description: 'Legendary DC music venue featuring diverse acts',
        ownerId: venueManager.id
      },
      {
        name: 'The Troubadour',
        address: '9081 Santa Monica Blvd',
        city: 'West Hollywood',
        state: 'CA',
        zipCode: '90069',
        country: 'USA',
        capacity: 400,
        latitude: 34.0815,
        longitude: -118.3874,
        description: 'Historic LA venue where Elton John made his US debut',
        ownerId: venueManager.id
      },
      {
        name: 'The Fillmore',
        address: '1805 Geary Blvd',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94115',
        country: 'USA',
        capacity: 1150,
        latitude: 37.7841,
        longitude: -122.4332,
        description: 'Historic venue from the psychedelic era',
        ownerId: venueManager.id
      },
      {
        name: 'Red Rocks Amphitheatre',
        address: '18300 W Alameda Pkwy',
        city: 'Morrison',
        state: 'CO',
        zipCode: '80465',
        country: 'USA',
        capacity: 9525,
        latitude: 39.6655,
        longitude: -105.2059,
        description: 'Iconic outdoor venue carved into a rock structure',
        ownerId: venueManager.id
      },
      {
        name: 'The Ryman Auditorium',
        address: '116 5th Ave N',
        city: 'Nashville',
        state: 'TN',
        zipCode: '37219',
        country: 'USA',
        capacity: 2362,
        latitude: 36.1614,
        longitude: -86.7785,
        description: 'Mother Church of Country Music',
        ownerId: venueManager.id
      },
      {
        name: 'House of Blues',
        address: '329 N Dearborn St',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60654',
        country: 'USA',
        capacity: 1800,
        latitude: 41.8879,
        longitude: -87.6295,
        description: 'Famous blues and rock venue in downtown Chicago',
        ownerId: venueManager.id
      },
      {
        name: 'The Bug Jar',
        address: '219 Monroe Ave',
        city: 'Rochester',
        state: 'NY',
        zipCode: '14607',
        country: 'USA',
        capacity: 400,
        latitude: 43.1497,
        longitude: -77.5916,
        description: 'Intimate Rochester venue known for indie and punk shows',
        ownerId: venueManager.id
      }
    ];

    const insertedVenues = await db.insert(venues).values(venueDataList).returning();

    // Create realistic venue network connections
    for (let i = 0; i < insertedVenues.length; i++) {
      for (let j = i + 1; j < insertedVenues.length; j++) {
        // Calculate distance-based trust score
        const distance = Math.sqrt(
          Math.pow(insertedVenues[i].latitude! - insertedVenues[j].latitude!, 2) +
          Math.pow(insertedVenues[i].longitude! - insertedVenues[j].longitude!, 2)
        );

        // Higher trust score for venues closer together
        const trustScore = Math.max(70, Math.min(95, 100 - (distance * 2)));

        await db.insert(venueNetwork).values({
          venueId: insertedVenues[i].id,
          connectedVenueId: insertedVenues[j].id,
          status: 'active',
          trustScore: Math.floor(trustScore),
          collaborativeBookings: Math.floor(Math.random() * 10) + 1 // 1-10 collaborations
        });
      }
    }

    console.log('Database seeded successfully with real venues');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();