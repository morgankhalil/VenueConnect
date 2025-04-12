
import { Router } from 'express';
import { createServer } from 'http';
import tourRoutes from './routes/tour-routes';
import documentationRoutes from './routes/documentation-routes';
import userRoutes from './routes/user-routes';
import authRoutes from './routes/auth-routes';
import venueRoutes from './routes/venue-routes';
import artistRoutes from './routes/artist-routes';
import dashboardRoutes from './routes/dashboard-routes';
import venueNetworkRoutes from './routes/venue-network-routes';
import tourRouteOptimizationRouter from './routes/tour-route-optimization-fixed';
import tourOptimizationEnhancedRouter from './routes/tour-optimization-enhanced';
import { aiOptimizationRouter } from './routes/ai-tour-optimizer';
import { unifiedOptimizerRouter } from './routes/unified-tour-optimizer';
import { type Express } from 'express';
import { type Server } from 'http';

export function registerRoutes(app: Express): Server {
  // Create HTTP server
  const server = createServer(app);
  // Register routes with more specific prefixes to avoid conflicts with the Vite server
  app.use('/api/tours', tourRoutes);
app.use('/api/documentation', documentationRoutes);
  app.use('/api/tour-optimization', tourRouteOptimizationRouter);
  app.use('/api/tour-optimization-enhanced', tourOptimizationEnhancedRouter);
  app.use('/api/ai-optimization', aiOptimizationRouter);
  app.use('/api/unified-optimizer', unifiedOptimizerRouter);
  app.use('/api/users', userRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/venues', venueRoutes);
  app.use('/api/artists', artistRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/venue-network', venueNetworkRoutes);
  
  // Both user-info and venue selection are now handled in their respective route files
  
  return server;
}
