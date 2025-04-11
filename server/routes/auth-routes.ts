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
    let user;
    
    // For demo/testing purposes, accept hardcoded admin/venueManager credentials
    if (username === 'admin' && password === 'password') {
      // Create a mock admin user
      user = {
        id: 1,
        username: 'admin',
        name: 'Admin User',
        role: 'admin',
        venueId: 1 // Default venue ID
      };
    } else if (username === 'venueManager' && password === 'password') {
      // Create a mock venue manager user
      user = {
        id: 2,
        username: 'venueManager',
        name: 'Venue Manager',
        role: 'venue_manager',
        venueId: 217 // The first venue from the database (40 Watt Club)
      };
    } else {
      // Try to find the user in the database
      user = await db.query.users.findFirst({
        where: eq(users.username, username),
      });
      
      // In a real application, we would verify password hash here
      // For simplicity in this demo, we're accepting any password for DB users
    }
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid username or password'
      });
    }
    
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
  try {
    console.log('Logging out user...');
    
    if (process.env.NODE_ENV !== 'production') {
      // In development mode, set the loggedOut flag to true and remove user data
      if (req.session) {
        // First delete the user information
        delete req.session.user;
        
        // Set the explicit logout flag
        // @ts-ignore - Add a logout flag to the session
        req.session.loggedOut = true;
        
        // Save the session changes explicitly
        req.session.save((err) => {
          if (err) {
            console.error('Error saving session during logout:', err);
            return res.status(500).json({
              error: 'Failed to logout'
            });
          }
          
          console.log('Session saved, user logged out successfully in development mode');
          return res.json({
            success: true,
            message: 'Logged out successfully'
          });
        });
      } else {
        return res.json({
          success: true,
          message: 'Already logged out'
        });
      }
    } else {
      // In production mode, destroy the session
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session during logout:', err);
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
  } catch (error) {
    console.error('Unexpected error during logout:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred during logout'
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