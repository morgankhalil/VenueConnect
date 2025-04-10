
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
    req.session.user.venueId = venueId;
    
    res.json({ 
      success: true, 
      message: `Now viewing as venue ID: ${venueId}`,
      user: req.session.user
    });
  });
  
  return app;
}
