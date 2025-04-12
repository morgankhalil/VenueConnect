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
    // Demo mode - always return admin stats
    const [venueCount] = await db.select({ count: count() }).from(venues);
    
    const [eventCount] = await db.select({ count: count() }).from(events);
    
    const [tourCount] = await db.select({ count: count() }).from(tours);
    
    // Use SQL directly to avoid table name issues after renaming
    const confirmedCountResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM "tourVenues" 
      WHERE status = 'confirmed'
    `);
    const confirmedCount = { count: Number(confirmedCountResult.rows[0]?.count || 0) };
    
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