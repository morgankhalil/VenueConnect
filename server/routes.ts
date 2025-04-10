
import { Router } from 'express';
import tourRoutes from './routes/tour-routes';
import userRoutes from './routes/user-routes';
import { type Express } from 'express';

export function registerRoutes(app: Express) {
  // Register routes
  app.use('/api', tourRoutes);
  app.use('/api', userRoutes);
  
  // Add user info endpoint
  app.get('/api/user-info', (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.session.user);
  });
  
  // Add venue selection endpoint
  app.get('/api/select-venue/:id', async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const venueId = Number(req.params.id);
    console.log(`Changing user's venue from ${req.session.user.venueId} to ${venueId}`);
    
    // Update venueId in session
    req.session.user.venueId = venueId;
    
    // Force session save to ensure it persists immediately
    req.session.save((err) => {
      if (err) {
        console.error("Error saving session:", err);
        return res.status(500).json({ error: "Failed to update venue selection" });
      }
      
      res.json({ 
        success: true, 
        message: `Now viewing as venue ID: ${venueId}`,
        user: req.session.user
      });
    });
  });
  
  return app;
}
