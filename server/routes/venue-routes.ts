import express from 'express';
import { db } from '../db';
import { venues } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth-middleware';

const router = express.Router();

/**
 * Get connected venues
 * Returns venues connected to the current venue based on network data
 */
router.get('/connected', isAuthenticated, async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { role, venueId } = req.session.user;
    
    // If admin user or no venue is selected, return a reasonable selection of venues
    if (role === 'admin' || !venueId) {
      const connectedVenues = await db.query.venues.findMany({
        limit: 5,
        columns: {
          id: true,
          name: true,
          city: true,
          region: true
        },
        orderBy: venues.name
      });
      
      return res.json(connectedVenues);
    }
    
    // For venue managers, return venues similar to their assigned venue
    // In a real app, this would use a more sophisticated algorithm
    const connectedVenues = await db.query.venues.findMany({
      where: sql`${venues.id} != ${venueId}`,
      limit: 5,
      columns: {
        id: true,
        name: true,
        city: true,
        region: true
      },
      orderBy: venues.name
    });
    
    return res.json(connectedVenues);
  } catch (error) {
    console.error('Error fetching connected venues:', error);
    return res.status(500).json({ error: 'Failed to load connected venues' });
  }
});

/**
 * Select venue for current user
 * Updates the user's current selected venue
 */
router.get('/select/:id', isAuthenticated, async (req, res) => {
  try {
    const venueId = parseInt(req.params.id);
    
    if (isNaN(venueId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid venue ID format' 
      });
    }
    
    const venue = await db.query.venues.findFirst({
      where: eq(venues.id, venueId),
      columns: {
        id: true,
        name: true
      }
    });
    
    if (!venue) {
      return res.status(404).json({ 
        success: false,
        message: 'Venue not found' 
      });
    }
    
    // Update the user's current venue in the session
    if (req.session.user) {
      req.session.user.venueId = venue.id;
      
      // Save session changes
      req.session.save();
    }
    
    return res.status(200).json({
      success: true,
      message: `Now viewing ${venue.name}`,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error selecting venue:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to select venue' 
    });
  }
});

/**
 * Get venue by id
 * Returns detailed information about a specific venue
 */
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const venueId = parseInt(req.params.id);
    
    if (isNaN(venueId)) {
      return res.status(400).json({ error: 'Invalid venue ID format' });
    }
    
    const venue = await db.query.venues.findFirst({
      where: eq(venues.id, venueId)
    });
    
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }
    
    return res.json(venue);
  } catch (error) {
    console.error('Error fetching venue:', error);
    return res.status(500).json({ error: 'Failed to load venue' });
  }
});

/**
 * Get all venues
 * Returns a list of all venues
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const allVenues = await db.query.venues.findMany({
      columns: {
        id: true,
        name: true,
        city: true,
        region: true,
        country: true,
        latitude: true,
        longitude: true,
        capacity: true
      },
      orderBy: venues.name
    });
    
    return res.json(allVenues);
  } catch (error) {
    console.error('Error fetching venues:', error);
    return res.status(500).json({ error: 'Failed to load venues' });
  }
});

export default router;