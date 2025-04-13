
import { seedAllVenues, seedVenuesForCityByName } from './venue-seeder-google';
import { VenueFilter } from './core/seed-manager';

async function seedFilteredVenues(filter: VenueFilter) {
  try {
    // Get venues from Google Maps API first
    const seedResult = await seedAllVenues(5); // Limit to 5 cities for initial testing
    
    console.log('Seeding results:', {
      totalCities: seedResult.totalCities,
      totalFound: seedResult.totalFound,
      totalSaved: seedResult.totalSaved
    });

  } catch (error) {
    console.error('Error seeding filtered venues:', error);
    process.exit(1);
  }
}

// Run with default filter if no arguments provided
const filter: VenueFilter = {
  minCapacity: 100,
  maxCapacity: 5000,
  cities: ['New York', 'Los Angeles', 'Chicago'],
  states: ['NY', 'CA', 'IL']
};

seedFilteredVenues(filter);
