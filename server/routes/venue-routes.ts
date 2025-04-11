import express from 'express';
import { db } from '../db';
import { venues } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth-middleware';

const router = express.Router();

/**
 * Get venue by id
 * Returns detailed information about a specific venue
 */
router.get('/venues/:id', isAuthenticated, async (req, res) => {
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
router.get('/venues', isAuthenticated, async (req, res) => {
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

/**
 * Select venue for current user
 * Updates the user's current selected venue
 */
router.get('/select-venue/:id', isAuthenticated, async (req, res) => {
  try {
    const venueId = parseInt(req.params.id);
    
    if (isNaN(venueId)) {
      return res.status(400).json({ error: 'Invalid venue ID format' });
    }
    
    const venue = await db.query.venues.findFirst({
      where: eq(venues.id, venueId),
      columns: {
        id: true,
        name: true
      }
    });
    
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }
    
    // Update the user's current venue in the session
    if (req.session.user) {
      req.session.user.venueId = venue.id;
      
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      return res.json({
        success: true,
        message: `Now viewing ${venue.name}`,
        user: req.session.user
      });
    } else {
      return res.status(401).json({ error: 'User not authenticated' });
    }
  } catch (error) {
    console.error('Error selecting venue:', error);
    return res.status(500).json({ error: 'Failed to select venue' });
  }
});

export default router;