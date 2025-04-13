
import { Router } from 'express';
import { SeedManager } from '../core/seed-manager';
import { ConcertsApiSeeder } from '../core/concerts-api-seeder';

const seedingRouter = Router();

seedingRouter.post('/seed/:operation', async (req, res) => {
  try {
    const { operation } = req.params;
    const seedManager = new SeedManager();
    
    switch (operation) {
      case 'clear':
        await seedManager.clearDatabase();
        break;
      
      case 'sample':
        const sampleVenues = [
          {
            name: 'The Bowery Ballroom',
            city: 'New York',
            state: 'NY',
            capacity: 575,
            latitude: 40.7204,
            longitude: -73.9934,
            bandsintownId: 'bowery-ballroom'
          },
          {
            name: 'Brooklyn Steel',
            city: 'Brooklyn',
            state: 'NY',
            capacity: 1800,
            latitude: 40.7177,
            longitude: -73.9368,
            bandsintownId: 'brooklyn-steel'
          }
        ];
        await seedManager.run(sampleVenues);
        break;
        
      case 'concerts':
        const concertsSeeder = new ConcertsApiSeeder();
        await concertsSeeder.seedFromArtist("The Black Keys");
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Seeding error:', error);
    res.status(500).json({ error: 'Seeding operation failed' });
  }
});

export default seedingRouter;
