import express from 'express';
import { db } from '../db';
import { venues, events, tours, tourVenues } from '../../shared/schema';
import { eq, sql, count, and } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth-middleware';

const router = express.Router();

/**
 * Get dashboard statistics
 * Returns key metrics for the dashboard based on the user's venue
 * Route: /api/dashboard/stats
 */
router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { role } = req.session.user;
    const currentVenueId = req.session.currentVenueId;
    
    // Different stats based on role
    if (role === 'admin') {
      // Admin sees global stats
      const [venueCount] = await db.select({ count: count() }).from(venues);
      
      const [eventCount] = await db.select({ count: count() }).from(events);
      
      const [tourCount] = await db.select({ count: count() }).from(tours);
      
      const [confirmedCount] = await db.select({ count: count() })
        .from(tourVenues)
        .where(eq(tourVenues.status, 'confirmed'));
      
      return res.json({
        venueCount: venueCount.count,
        eventCount: eventCount.count,
        tourCount: tourCount.count,
        confirmedBookings: confirmedCount.count,
        role: 'admin',
        venueId: null
      });
    } else if (role === 'venue_manager' && currentVenueId) {
      // Venue manager sees stats for their venue
      const venue = await db.query.venues.findFirst({
        where: eq(venues.id, currentVenueId),
        columns: {
          id: true,
          name: true,
          city: true,
          region: true,
          country: true,
          capacity: true
        }
      });
      
      if (!venue) {
        return res.status(404).json({ error: 'Venue not found' });
      }
      
      const [eventCount] = await db.select({ count: count() })
        .from(events)
        .where(eq(events.venueId, currentVenueId));
      
      const [confirmedCount] = await db.select({ count: count() })
        .from(tourVenues)
        .where(and(
          eq(tourVenues.venueId, currentVenueId),
          eq(tourVenues.status, 'confirmed')
        ));
      
      const [pendingCount] = await db.select({ count: count() })
        .from(tourVenues)
        .where(and(
          eq(tourVenues.venueId, currentVenueId),
          eq(tourVenues.status, 'potential')
        ));
      
      return res.json({
        venue,
        eventCount: eventCount.count,
        confirmedBookings: confirmedCount.count,
        pendingBookings: pendingCount.count,
        role: 'venue_manager',
        venueId: currentVenueId
      });
    } else {
      // Default minimal stats if no role/venue match
      return res.json({
        message: 'Limited dashboard access',
        role: req.session.user.role || 'user',
        venueId: req.session.currentVenueId || null
      });
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ error: 'Failed to load dashboard statistics' });
  }
});

export default router;