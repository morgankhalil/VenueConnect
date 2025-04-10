import express from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { hasPermission } from '../middleware/auth-middleware';

const router = express.Router();

/**
 * Login endpoint
 * Accepts username and password, returns user information if credentials are valid
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }
    
    // In a real application, you would use proper hashed password comparison
    // This is a simplified version for demo purposes
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid username or password'
      });
    }
    
    // In a real application, compare password hash here
    // For demo, we'll accept any password
    
    // Set the user in session
    req.session.user = {
      id: user.id,
      name: user.name || user.username,
      role: user.role,
      venueId: user.venueId
    };
    
    // Clear the loggedOut flag
    // @ts-ignore
    req.session.loggedOut = false;
    
    return res.json({
      success: true,
      user: req.session.user
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'An error occurred during authentication'
    });
  }
});

/**
 * Logout endpoint
 * Destroys the session and clears user information
 */
router.post('/logout', (req, res) => {
  // In development mode, just set a flag to prevent auto-login
  if (process.env.NODE_ENV !== 'production') {
    if (req.session) {
      // @ts-ignore - Add a logout flag to the session
      req.session.loggedOut = true;
      // Also clear the user info
      req.session.user = undefined;
      
      return res.json({
        success: true,
        message: 'Logged out successfully'
      });
    }
  } else {
    // In production mode, destroy the session
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          error: 'Failed to logout'
        });
      }
      
      res.clearCookie('connect.sid');
      return res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  }
});

/**
 * Check authentication status endpoint
 * Returns current user information if authenticated
 */
router.get('/check', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({
      authenticated: true,
      user: req.session.user
    });
  }
  
  return res.status(401).json({
    authenticated: false,
    message: 'Not authenticated'
  });
});

/**
 * Protected route test endpoint
 * Requires admin permission to access
 */
router.get('/admin-only', hasPermission('canManageUsers'), (req, res) => {
  return res.json({
    success: true,
    message: 'You have admin access',
    user: req.session.user
  });
});

export default router;