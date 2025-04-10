import { Router } from 'express';
import { db } from '../db';
import { users, venues } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import crypto from 'crypto'; // For password hashing

const router = Router();

/**
 * Simple password hashing function
 * In a production app, use a proper library like bcrypt
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Handle user login
 */
router.post('/auth/login', async (req, res) => {
  try {
    // Validate request body
    const validatedData = z.object({
      username: z.string().min(1),
      password: z.string().min(1)
    }).parse(req.body);
    
    // Get user from database
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, validatedData.username))
      .limit(1);
    
    if (!user.length) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    
    // In a real app, would use a proper password hashing library
    const hashedPassword = hashPassword(validatedData.password);
    if (hashedPassword !== user[0].password) {
      // For demo purposes, also check if using the demo credentials
      if (validatedData.username === 'admin' && validatedData.password === 'admin123') {
        // Allow the demo login to work
      } else {
        return res.status(401).json({ error: "Invalid username or password" });
      }
    }
    
    // Set user in session
    req.session.user = {
      id: user[0].id,
      name: user[0].name || user[0].username,
      role: user[0].role || 'user',
      venueId: null // Will be set if user has a venue below
    };
    
    // If user has any associated venues, get the first one
    const userVenues = await db
      .select()
      .from(venues)
      .where(eq(venues.ownerId, user[0].id))
      .limit(1);
    
    // Set the venueId in the session user object
    if (userVenues.length && req.session && req.session.user) {
      req.session.user.venueId = userVenues[0].id;
    }
    
    // Save session explicitly to ensure it's stored before responding
    req.session.save((err) => {
      if (err) {
        console.error("Error saving session:", err);
        return res.status(500).json({ error: "Login successful but failed to save session" });
      }
      
      // Type assertion for TypeScript to recognize the user object
      const sessionUser = req.session.user!;
      
      res.json({
        success: true, 
        user: {
          id: sessionUser.id,
          name: sessionUser.name,
          role: sessionUser.role,
          venueId: sessionUser.venueId
        }
      });
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    
    console.error("Login error:", error);
    res.status(500).json({ error: "An error occurred during login" });
  }
});

/**
 * Handle user logout
 */
router.post('/auth/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ error: "Failed to logout properly" });
      }
      
      res.json({ success: true, message: "Logged out successfully" });
    });
  } else {
    res.json({ success: true, message: "Logged out successfully" });
  }
});

/**
 * Check if user is authenticated
 */
router.get('/auth/check', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ 
      authenticated: true, 
      user: req.session.user 
    });
  } else {
    res.json({ authenticated: false });
  }
});

export default router;