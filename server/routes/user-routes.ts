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
 * Returns all venues for admin users, filtered venues for other users based on role
 * Route: /api/users/available-venues
 */
router.get('/available-venues', isAuthenticated, async (req, res) => {
  try {
    // User is guaranteed to exist due to isAuthenticated middleware
    const { role } = req.session.user as { role: string };
    
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
    // For now, venue managers and other users get the first 5 venues (this will be replaced with a proper user-venue relation)
    else {
      availableVenues = await db.query.venues.findMany({
        columns: {
          id: true,
          name: true,
          city: true,
          region: true
        },
        orderBy: venues.name,
        limit: 5
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
        profileImageUrl: true,
        lastLogin: true
      },
      orderBy: users.name
    });
    
    return res.status(200).json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to load users' 
    });
  }
});

export default router;