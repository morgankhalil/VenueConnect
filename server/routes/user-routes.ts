import { Router } from 'express';
import { db } from '../db';
import { users, venues } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

const router = Router();

/**
 * Get the currently logged in user
 */
router.get('/user', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.session.user;
    
    // If the user has a venue ID, fetch the venue details
    if (user.venueId) {
      const venueResult = await db
        .select()
        .from(venues)
        .where(eq(venues.id, user.venueId))
        .limit(1);
      
      if (venueResult.length) {
        return res.json({
          ...user,
          venue: venueResult[0]
        });
      }
    }
    
    return res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});

/**
 * Set the user's current venue
 */
router.post('/user/venue', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // Validate request body
    const validatedData = z.object({
      venueId: z.number()
    }).parse(req.body);
    
    // Check if venue exists
    const venueResult = await db
      .select()
      .from(venues)
      .where(eq(venues.id, validatedData.venueId))
      .limit(1);
    
    if (!venueResult.length) {
      return res.status(404).json({ error: "Venue not found" });
    }
    
    // Update user's venue ID in session
    req.session.user.venueId = validatedData.venueId;
    
    // Update user's venue ID in database if needed
    if (req.session.user.id) {
      await db
        .update(users)
        .set({
          venueId: validatedData.venueId,
        })
        .where(eq(users.id, req.session.user.id));
    }
    
    res.json({ 
      ...req.session.user,
      venue: venueResult[0]
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    
    console.error("Error updating user venue:", error);
    res.status(500).json({ error: "Failed to update user venue" });
  }
});

/**
 * Get available venues for the user to select
 */
router.get('/user/available-venues', async (req, res) => {
  try {
    // Get all venues
    const venueResult = await db
      .select()
      .from(venues)
      .orderBy(venues.name);
    
    res.json(venueResult);
  } catch (error) {
    console.error("Error fetching available venues:", error);
    res.status(500).json({ error: "Failed to fetch available venues" });
  }
});

export default router;