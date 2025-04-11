
import { Router } from 'express';
import { createServer } from 'http';
import tourRoutes from './routes/tour-routes';
import userRoutes from './routes/user-routes';
import authRoutes from './routes/auth-routes';
import venueRoutes from './routes/venue-routes';
import dashboardRoutes from './routes/dashboard-routes';
import { type Express } from 'express';
import { type Server } from 'http';

export function registerRoutes(app: Express): Server {
  // Create HTTP server
  const server = createServer(app);
  // Register routes
  app.use('/api', tourRoutes);
  app.use('/api', userRoutes);
  app.use('/api', authRoutes);
  app.use('/api', venueRoutes);
  app.use('/api', dashboardRoutes);
  
  // Both user-info and venue selection are now handled in their respective route files
  
  return server;
}
