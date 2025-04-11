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
  return res.status(200).json(req.session.user);
});

/**
 * Get available venues for the current user
 * Returns all venues for admin users, only assigned venue for other users
 * Route: /api/users/available-venues
 */
router.get('/available-venues', isAuthenticated, async (req, res) => {
  try {
    // User is guaranteed to exist due to isAuthenticated middleware
    const { role, venueId } = req.session.user as { role: string, venueId: number | null };
    
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
    
    return res.status(200).json(availableVenues);
  } catch (error) {
    console.error('Error fetching available venues:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to load available venues' 
    });
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
        venue_id: true,
        profileImageUrl: true,
        lastLogin: true
      },
      orderBy: users.name
    });
    
    // Convert to frontend field names
    const formattedUsers = allUsers.map(user => ({
      ...user,
      venueId: user.venue_id,
      venue_id: undefined
    }));
    
    return res.status(200).json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to load users' 
    });
  }
});

export default router;