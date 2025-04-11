import express from 'express';
import { db } from '../db';
import { users, venues } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { isAuthenticated, hasPermission } from '../middleware/auth-middleware';

const router = express.Router();

/**
 * Get current user information
 */
router.get('/user', isAuthenticated, (req, res) => {
  // User is guaranteed to exist due to isAuthenticated middleware
  return res.json(req.session.user);
});

/**
 * Get available venues for the current user
 * Returns all venues for admin users, only assigned venue for other users
 */
router.get('/user/available-venues', isAuthenticated, async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { role, venueId } = req.session.user;
    
    let availableVenues: any[] = [];
    
    // Admin can see all venues
    if (role === 'admin') {
      availableVenues = await db.query.venues.findMany({
        columns: {
          id: true,
          name: true,
          city: true,
          region: true
        },
        orderBy: venues.name
      });
    } 
    // Other users can only see their assigned venue(s)
    else if (venueId) {
      availableVenues = await db.query.venues.findMany({
        where: eq(venues.id, venueId),
        columns: {
          id: true,
          name: true,
          city: true,
          region: true
        }
      });
    }
    
    return res.json(availableVenues);
  } catch (error) {
    console.error('Error fetching available venues:', error);
    return res.status(500).json({ error: 'Failed to load available venues' });
  }
});

/**
 * User management endpoints - requires admin permission
 */
router.get('/users', isAuthenticated, hasPermission('canManageUsers'), async (req, res) => {
  try {
    const allUsers = await db.query.users.findMany({
      columns: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        venueId: true,
        profileImageUrl: true,
        lastLogin: true
      },
      orderBy: users.name
    });
    
    return res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to load users' });
  }
});

export default router;