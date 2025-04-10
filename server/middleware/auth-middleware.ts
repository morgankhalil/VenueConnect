import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if a user is authenticated
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

/**
 * Middleware to check if a user has admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: "Admin privileges required" });
  }
  
  next();
};

/**
 * Middleware to check if a user has venue manager role
 */
export const requireVenueManager = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (req.session.user.role !== 'venue_manager' && req.session.user.role !== 'admin') {
    return res.status(403).json({ error: "Venue manager privileges required" });
  }
  
  next();
};

/**
 * Middleware to check if a user has artist role
 */
export const requireArtist = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (req.session.user.role !== 'artist' && req.session.user.role !== 'admin') {
    return res.status(403).json({ error: "Artist privileges required" });
  }
  
  next();
};

/**
 * Middleware to check if a user has a venue assigned
 */
export const requireVenue = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (!req.session.user.venueId) {
    return res.status(403).json({ error: "No venue assigned to user" });
  }
  
  next();
};

/**
 * Middleware to check if a user has access to a specific venue
 * Use this for routes with venue ID parameters
 */
export const requireVenueAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  // Admin can access any venue
  if (req.session.user.role === 'admin') {
    return next();
  }
  
  // Get venue ID from request parameters
  const venueId = Number(req.params.venueId);
  
  // Check if user has access to this venue
  if (req.session.user.venueId !== venueId) {
    return res.status(403).json({ error: "No access to specified venue" });
  }
  
  next();
};