
import { Router } from 'express';
import tourRoutes from './routes/tour-routes';
import { type Express } from 'express';

export function registerRoutes(app: Express) {
  // Register tour routes
  app.use('/api', tourRoutes);
  
  return app;
}
