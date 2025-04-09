import { Router } from 'express';
import { syncVenuesFromBandsInTown } from '../data-sync/bands-in-town-sync';
import dotenv from 'dotenv';

// Load environment variables 
dotenv.config();

const adminRouter = Router();

/**
 * Admin-only route to trigger venue network sync
 * This shouldn't be exposed to regular users
 */
adminRouter.post('/sync-venues', async (req, res) => {
  try {
    // In a real app, you would check if the user is an admin here
    // For demo purposes, we're allowing this to be called without authentication
    
    const { venueId, radius = 250, limit = 10 } = req.body;
    
    if (!venueId) {
      return res.status(400).json({ error: 'venueId is required' });
    }
    
    // Run the sync asynchronously - we don't want to block the response
    console.log(`Venue sync triggered for venue ID ${venueId}`);
    
    // Return success immediately - sync will run in background
    res.json({ message: 'Venue sync started' });
    
    // Run the actual sync after response is sent
    syncVenuesFromBandsInTown(venueId, radius, limit)
      .then((venues) => {
        console.log(`Venue sync completed. Added ${venues.length} venues.`);
      })
      .catch((error) => {
        console.error('Error during venue sync:', error);
      });
  } catch (error) {
    console.error('Error triggering venue sync:', error);
    res.status(500).json({ error: 'Failed to trigger venue sync' });
  }
});

// Route to handle saving the Bandsintown API key
// Note: In a production app, this would be securely handled with proper encryption
adminRouter.post('/api-keys/bandsintown', (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    // In a real app, you would securely store this key 
    // For this demo, we're just setting it in the environment
    process.env.BANDSINTOWN_API_KEY = apiKey;
    
    console.log('Bandsintown API key has been updated');
    res.json({ success: true, message: 'API key saved successfully' });
  } catch (error) {
    console.error('Error saving API key:', error);
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

export default adminRouter;