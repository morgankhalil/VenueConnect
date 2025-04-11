import express from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { hasPermission } from '../middleware/auth-middleware';

const router = express.Router();

/**
 * Login endpoint
 * Accepts username and password, returns user information if credentials are valid
 * Route: /api/auth/login
 */
router.post('/', async (req, res) => {
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
    
    // Find user in the database by username - select only columns that exist in DB
    user = await db.query.users.findFirst({
      where: eq(users.username, username),
      columns: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        venue_id: true
      }
    });
    
    // In a real application, this would be a hashed password comparison
    // For simplicity in this demo, we're just checking for the password 'password'
    if (user && password !== 'password') {
      user = null; // Invalid password
    }
    
    // If valid user, prepare the user object for session
    if (user) {
      console.log(`User authenticated from database: ${user.id} (${user.name}), Role: ${user.role}`);
    }
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid username or password'
      });
    }
    
    // Set the user in session - ensure property names match between client and server
    const sessionUser = {
      id: user.id,
      name: user.name || user.username,
      role: user.role,
      venueId: user.venue_id // Convert venue_id from database to venueId for frontend consistency
    };
    
    console.log('Setting user session with data:', JSON.stringify(sessionUser));
    req.session.user = sessionUser;
    
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