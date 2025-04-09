import { Router } from 'express';
import { syncVenuesFromBandsInTown } from '../data-sync/bands-in-town-sync';
import { 
  registerBandsintownWebhook, 
  unregisterBandsintownWebhook,
  verifyWebhookConnection
} from '../webhooks/webhook-setup';
import dotenv from 'dotenv';

// Load environment variables 
dotenv.config();

const adminRouter = Router();

/**
 * Admin-only route to trigger venue network sync
 * This shouldn't be exposed to regular users
 */
// Middleware to check if the user has admin rights
const requireAdmin = (req, res, next) => {
  // In a real app, you would check the user's role from their session/token
  // and only allow admins to proceed
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }
};

adminRouter.post('/sync-venues', requireAdmin, async (req, res) => {
  try {
    // Extract and validate parameters
    const venueId = parseInt(req.body.venueId);
    const radius = req.body.radius ? parseInt(req.body.radius) : 250;
    const limit = req.body.limit ? parseInt(req.body.limit) : 10;
    
    // Validate venueId
    if (!venueId || isNaN(venueId) || venueId <= 0) {
      return res.status(400).json({ error: 'Valid venueId is required (must be a positive number)' });
    }
    
    // Validate radius
    if (isNaN(radius) || radius < 0 || radius > 500) {
      return res.status(400).json({ error: 'Radius must be between 0 and 500' });
    }
    
    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Limit must be between 1 and 100' });
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

// Route to check if the Bandsintown API key is configured
// Does not expose the actual key value to the client
// Admin-only route
adminRouter.get('/api-keys/bandsintown/status', requireAdmin, (req, res) => {
  try {
    // Check if the Bandsintown API key is set in secrets
    // We don't expose the actual key value, just whether it exists
    if (process.env.BANDSINTOWN_API_KEY) {
      res.json({ 
        configured: true, 
        message: 'Bandsintown API key is configured'
      });
    } else {
      res.json({ 
        configured: false, 
        message: 'Bandsintown API key is not configured'
      });
    }
  } catch (error) {
    console.error('Error checking API key status:', error);
    res.status(500).json({ error: 'Failed to check API key status' });
  }
});

// Route to set the Bandsintown API key
// Only accessible to admin users
adminRouter.post('/api-keys/bandsintown', requireAdmin, (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'API key is required' 
      });
    }
    
    // In a real application, you would securely store this API key
    // For now, we'll just set it as an environment variable
    // NOTE: This is for demonstration only, in production you would use a secure storage solution
    process.env.BANDSINTOWN_API_KEY = apiKey;
    
    res.json({ 
      success: true, 
      message: 'Bandsintown API key has been configured' 
    });
  } catch (error) {
    console.error('Error setting API key:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to set API key' 
    });
  }
});

// Route to register a webhook with Bandsintown
adminRouter.post('/webhooks/register', requireAdmin, async (req, res) => {
  try {
    const { callbackUrl } = req.body;

    if (!callbackUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'Callback URL is required' 
      });
    }

    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bandsintown API key is not configured' 
      });
    }

    const result = await registerBandsintownWebhook(
      callbackUrl, 
      apiKey
    );

    res.json(result);
  } catch (error) {
    console.error('Error registering webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to register webhook' 
    });
  }
});

// Route to unregister a webhook with Bandsintown
adminRouter.post('/webhooks/unregister', requireAdmin, async (req, res) => {
  try {
    const { callbackUrl } = req.body;

    if (!callbackUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'Callback URL is required' 
      });
    }

    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bandsintown API key is not configured' 
      });
    }

    const result = await unregisterBandsintownWebhook(
      callbackUrl, 
      apiKey
    );

    res.json(result);
  } catch (error) {
    console.error('Error unregistering webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to unregister webhook' 
    });
  }
});

// Route to test a webhook connection
adminRouter.post('/webhooks/test', requireAdmin, async (req, res) => {
  try {
    const { callbackUrl } = req.body;

    if (!callbackUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'Callback URL is required' 
      });
    }

    const apiKey = process.env.BANDSINTOWN_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bandsintown API key is not configured' 
      });
    }

    const result = await verifyWebhookConnection(
      callbackUrl, 
      apiKey
    );

    res.json(result);
  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to test webhook' 
    });
  }
});

export default adminRouter;