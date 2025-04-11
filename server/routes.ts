
import { Router } from 'express';
import { createServer } from 'http';
import tourRoutes from './routes/tour-routes';
import userRoutes from './routes/user-routes';
import authRoutes from './routes/auth-routes';
import venueRoutes from './routes/venue-routes';
import dashboardRoutes from './routes/dashboard-routes';
import venueNetworkRoutes from './routes/venue-network-routes';
import tourRouteOptimizationRouter from './routes/tour-route-optimization-fixed';
import tourOptimizationEnhancedRouter from './routes/tour-optimization-enhanced';
import aiTourOptimizerRouter from './routes/ai-tour-optimizer';
import { type Express } from 'express';
import { type Server } from 'http';

export function registerRoutes(app: Express): Server {
  // Create HTTP server
  const server = createServer(app);
  // Register routes with more specific prefixes to avoid conflicts with the Vite server
  app.use('/api/tours', tourRoutes);
  app.use('/api/tour-optimization', tourRouteOptimizationRouter);
  app.use('/api/tour-optimization-enhanced', tourOptimizationEnhancedRouter);
  app.use('/api/ai-optimization', aiTourOptimizerRouter);
  app.use('/api/users', userRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/venues', venueRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/venue-network', venueNetworkRoutes);
  
  // Both user-info and venue selection are now handled in their respective route files
  
  return server;
}
