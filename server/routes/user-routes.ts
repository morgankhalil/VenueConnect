import express from 'express';
import { db } from '../db';
import { users, venues } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { isAuthenticated, hasPermission } from '../middleware/auth-middleware';

const router = express.Router();

/**
 * Get current user information
 * Route: /api/users/me
 */
router.get('/me', isAuthenticated, (req, res) => {
  console.log("Session in /api/users/me:", req.session);
  console.log("Session user:", req.session.user);
  console.log("Session ID:", req.sessionID);
  
  // User is guaranteed to exist due to isAuthenticated middleware
  if (!req.session.user) {
    console.log("WARNING: User should be guaranteed by isAuthenticated middleware but is missing");
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Ensure user has the expected data structure
  const user = {
    id: req.session.user.id,
    name: req.session.user.name,
    role: req.session.user.role,
    venueId: req.session.user.venueId
  };
  
  console.log("Returning user data:", user);
  return res.json(user);
});

/**
 * Get available venues for the current user
 * Returns all venues for admin users, only assigned venue for other users
 * Route: /api/users/available-venues
 */
router.get('/available-venues', isAuthenticated, async (req, res) => {
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
 * Route: /api/users/list
 */
router.get('/list', isAuthenticated, hasPermission('canManageUsers'), async (req, res) => {
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