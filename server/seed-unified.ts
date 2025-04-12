
import { db } from './db';
import { SeedManager } from './core/seed-manager';
import dotenv from 'dotenv';

interface SeedOptions {
  clearFirst?: boolean;
  seedVenues?: boolean;
  seedArtists?: boolean;
  seedEvents?: boolean;
  seedTours?: boolean;
  seedNetwork?: boolean;
  sourceVenue?: string;
  radius?: number;
  limit?: number;
}

async function seedDatabase(options: SeedOptions = {}) {
  const manager = new SeedManager();
  
  try {
    console.log('Starting unified database seeding...');
    
    if (options.clearFirst) {
      await manager.clearDatabase();
    }

    if (options.seedVenues) {
      console.log('Seeding venues...');
      await manager.seedVenues(options.sourceVenue, options.radius, options.limit);
    }

    if (options.seedArtists) {
      console.log('Seeding artists...');
      await manager.seedArtists();
    }

    if (options.seedEvents) {
      console.log('Seeding events...');
      await manager.seedEvents();
    }

    if (options.seedTours) {
      console.log('Seeding tours...');
      await manager.seedTours();
    }

    if (options.seedNetwork) {
      console.log('Seeding venue network...');
      await manager.createVenueNetwork(await manager.getFilteredVenues({}));
    }

    console.log('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Example usage:
seedDatabase({
  clearFirst: true,
  seedVenues: true,
  seedArtists: true,
  seedEvents: true,
  seedTours: true,
  seedNetwork: true,
  radius: 50,
  limit: 20
});
