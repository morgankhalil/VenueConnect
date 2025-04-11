import express from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { isAuthenticated, hasPermission } from '../middleware/auth-middleware';

const router = express.Router();

/**
 * Login endpoint
 * Accepts username and password, returns user information if credentials are valid
 * Route: /api/auth
 */
router.post('/', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    // Find user in the database by username
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
      columns: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    // In a real application, this would be a hashed password comparison
    if (!user || password !== 'password') {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Set the user in session with consistent property names
    const sessionUser = {
      id: user.id,
      name: user.name || user.username,
      role: user.role || 'user'
    };
    
    req.session.user = sessionUser;
    
    return res.status(200).json({
      success: true,
      user: sessionUser
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login'
    });
  }
});

/**
 * Logout endpoint
 * Destroys the session and clears user information
 * Route: /api/auth/logout
 */
router.post('/logout', (req, res) => {
  // Simply delete the user from session
  if (req.session) {
    delete req.session.user;
    
    return req.session.save((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Failed to logout'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  }
  
  return res.status(200).json({
    success: true,
    message: 'Already logged out'
  });
});

/**
 * Check authentication status endpoint
 * Returns current user information if authenticated
 * Route: /api/auth/status
 */
router.get('/status', (req, res) => {
  if (req.session && req.session.user) {
    return res.status(200).json({
      success: true,
      authenticated: true,
      user: req.session.user,
      currentVenueId: req.session.currentVenueId || null
    });
  }
  
  return res.status(200).json({
    success: true,
    authenticated: false
  });
});

/**
 * Protected route test endpoint
 * Requires admin permission to access
 * Route: /api/auth/admin-only
 */
router.get('/admin-only', isAuthenticated, hasPermission('canManageUsers'), (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'You have admin access',
    user: req.session.user
  });
});

export default router;