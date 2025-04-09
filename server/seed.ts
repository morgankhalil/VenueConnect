
import { db } from './db';
import { 
  users, venues, artists, events, predictions, inquiries, 
  venueNetwork, collaborativeOpportunities, collaborativeParticipants,
  webhookConfigurations
} from '../shared/schema';
import { syncArtistFromBandsInTown } from './data-sync/bands-in-town-sync';

async function seed() {
  try {
    // Clear all existing data
    console.log('Clearing existing data...');
    await db.delete(collaborativeParticipants);
    await db.delete(collaborativeOpportunities);
    await db.delete(predictions);
    await db.delete(inquiries);
    await db.delete(events);
    await db.delete(venueNetwork);
    await db.delete(venues);
    await db.delete(artists);
    await db.delete(users);
    await db.delete(webhookConfigurations);
    console.log('Database cleared successfully');

    // Create demo user
    const [user] = await db.insert(users).values({
      username: 'demo',
      password: 'demo123',
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'venue_manager'
    }).returning();

    // Insert Bug Jar venue
    const [venue] = await db.insert(venues).values({
      name: 'Bug Jar',
      address: '219 Monroe Ave',
      city: 'Rochester',
      state: 'NY',
      zipCode: '14607',
      country: 'USA',
      capacity: 300,
      latitude: 43.1517,
      longitude: -77.5959,
      description: 'The Bug Jar is a legendary Rochester music venue known for its indie and alternative shows',
      contactEmail: 'info@bugjar.com',
      contactPhone: '585-454-2966',
      website: 'http://bugjar.com',
      ownerId: user.id
    }).returning();

    // Create admin user
    const [adminUser] = await db.insert(users).values({
      username: 'admin',
      password: 'admin123',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin'
    }).returning();
    
    // Sync some real artists that commonly play at Bug Jar
    const artistNames = [
      'Cloud Nothings',
      'Big Thief',
      'King Gizzard & The Lizard Wizard',
      'Thee Oh Sees',
      'Ty Segall',
      'Mac DeMarco',
      'Kurt Vile',
      'Japanese Breakfast',
      'Angel Olsen',
      'Parquet Courts'
    ];

    const sampleArtists = [];
    for (const name of artistNames) {
      try {
        const artist = await syncArtistFromBandsInTown(name);
        if (artist) {
          sampleArtists.push(artist);
          console.log(`Added artist: ${artist.name}`);
        }
      } catch (err) {
        console.error(`Error syncing artist ${name}:`, err);
      }
    }

    // Create more venues for network
    const networkVenues = await db.insert(venues).values([
      {
        name: 'Water Street Music Hall',
        address: '204 N Water St',
        city: 'Rochester',
        state: 'NY',
        zipCode: '14604',
        country: 'USA',
        capacity: 800,
        latitude: 43.1594,
        longitude: -77.6039,
        description: 'Historic Rochester venue with multiple performance spaces',
        contactEmail: 'info@waterstreetmusic.com',
        ownerId: user.id
      },
      {
        name: 'Town Ballroom',
        address: '681 Main St',
        city: 'Buffalo',
        state: 'NY',
        zipCode: '14203',
        country: 'USA',
        capacity: 1000,
        latitude: 42.8925,
        longitude: -78.8725,
        description: 'Premier music venue in downtown Buffalo',
        contactEmail: 'info@townballroom.com',
        ownerId: user.id
      }
    ]).returning();

    // Create venue connections
    await db.insert(venueNetwork).values([
      {
        venueId: venue.id,
        connectedVenueId: networkVenues[0].id,
        status: 'active',
        trustScore: 85,
        collaborativeBookings: 12
      },
      {
        venueId: venue.id,
        connectedVenueId: networkVenues[1].id,
        status: 'active',
        trustScore: 78,
        collaborativeBookings: 8
      }
    ]);

    // Add sample events - both past and upcoming
    const currentDate = new Date();
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(currentDate.getMonth() + 1);
    
    await db.insert(events).values([
      {
        artistId: sampleArtists[0].id,
        venueId: venue.id,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15).toISOString().split('T')[0],
        startTime: '20:00',
        status: 'confirmed',
        ticketUrl: 'https://tickets.example.com/event1'
      },
      {
        artistId: sampleArtists[1].id,
        venueId: venue.id,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 22).toISOString().split('T')[0],
        startTime: '19:30',
        status: 'confirmed',
        ticketUrl: 'https://tickets.example.com/event2'
      },
      {
        artistId: sampleArtists[2].id,
        venueId: venue.id,
        date: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 5).toISOString().split('T')[0],
        startTime: '21:00',
        status: 'hold',
        ticketUrl: null
      },
      {
        artistId: sampleArtists[0].id,
        venueId: networkVenues[0].id,
        date: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 7).toISOString().split('T')[0],
        startTime: '20:00',
        status: 'opportunity',
        ticketUrl: null
      }
    ]);

    // Add predictions for booking recommendations
    await db.insert(predictions).values([
      {
        artistId: sampleArtists[2].id,
        venueId: venue.id,
        suggestedDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 10).toISOString().split('T')[0],
        confidenceScore: 87,
        status: 'pending',
        reasoning: 'Based on similar artists performing well at this venue and regional touring patterns'
      },
      {
        artistId: sampleArtists[1].id,
        venueId: networkVenues[1].id,
        suggestedDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 15).toISOString().split('T')[0],
        confidenceScore: 92,
        status: 'pending',
        reasoning: 'High match based on venue capacity, genre alignment, and previous ticket sales in the region'
      }
    ]);

    // Insert predefined webhook configurations
    await db.insert(webhookConfigurations).values([
      {
        name: 'Bandsintown Event Notifications',
        description: 'Receive notifications when new events are created on Bandsintown',
        type: 'bandsintown_events',
        callbackUrl: '/api/webhooks/bandsintown/events',
        isEnabled: false,
        secretKey: '',
        configOptions: JSON.stringify({
          events: ['event.created', 'event.updated', 'event.canceled'],
          version: '1.0'
        })
      },
      {
        name: 'Artist Updates',
        description: 'Receive notifications about artist profile updates',
        type: 'artist_updates',
        callbackUrl: '/api/webhooks/artists/updates',
        isEnabled: false,
        secretKey: '',
        configOptions: JSON.stringify({
          includeImages: true,
          includeGenres: true,
          version: '1.0'
        })
      },
      {
        name: 'Venue Capacity Changes',
        description: 'Get notified when venue capacity information changes',
        type: 'venue_capacity',
        callbackUrl: '/api/webhooks/venues/capacity',
        isEnabled: false,
        secretKey: '',
        configOptions: JSON.stringify({
          thresholdPercentage: 10,
          notifyOnIncrease: true,
          notifyOnDecrease: true,
          version: '1.0'
        })
      }
    ]);

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
