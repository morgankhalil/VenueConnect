import express from 'express';
import { db } from '../db';
import { venues, events, tours, tourVenues } from '../../shared/schema';
import { eq, sql, count, and } from 'drizzle-orm';

const router = express.Router();

/**
 * Get dashboard statistics
 * Returns key metrics for the dashboard
 * Route: /api/dashboard/stats
 * In demo mode, no authentication is required
 */
router.get('/stats', async (req, res) => {
  try {
    // Default values in case tables don't exist yet
    let venueCount = { count: 0 };
    let eventCount = { count: 0 };
    let tourCount = { count: 0 };
    let confirmedCount = { count: 0 };
    
    try {
      // Try to get venue count
      const venueCountResult = await db.select({ count: count() }).from(venues);
      if (venueCountResult && venueCountResult.length > 0) {
        venueCount = venueCountResult[0];
      }
    } catch (err) {
      console.log('Venues table not ready yet');
    }
    
    try {
      // Try to get event count
      const eventCountResult = await db.select({ count: count() }).from(events);
      if (eventCountResult && eventCountResult.length > 0) {
        eventCount = eventCountResult[0];
      }
    } catch (err) {
      console.log('Events table not ready yet');
    }
    
    try {
      // Try to get tour count
      const tourCountResult = await db.select({ count: count() }).from(tours);
      if (tourCountResult && tourCountResult.length > 0) {
        tourCount = tourCountResult[0];
      }
    } catch (err) {
      console.log('Tours table not ready yet');
    }
    
    try {
      // Use SQL directly to check if tourVenues table exists
      const confirmedCountResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM "tourVenues" 
        WHERE status = 'confirmed'
      `);
      if (confirmedCountResult && confirmedCountResult.rows && confirmedCountResult.rows.length > 0) {
        confirmedCount = { count: Number(confirmedCountResult.rows[0]?.count || 0) };
      }
    } catch (err) {
      console.log('TourVenues table not ready yet');
    }
    
    return res.json({
      venueCount: venueCount.count,
      eventCount: eventCount.count,
      tourCount: tourCount.count,
      confirmedBookings: confirmedCount.count,
      role: 'admin',
      venueId: null
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ error: 'Failed to load dashboard statistics' });
  }
});

export default router;