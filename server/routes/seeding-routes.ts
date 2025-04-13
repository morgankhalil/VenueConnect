
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
        await seedManager.run();
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
