import express from 'express';
import { db } from '../db';
import { venues, venueConnections } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth-middleware';

const router = express.Router();

/**
 * Get venue network graph for visualization
 * Returns nodes (venues) and links (connections) for the specified venue's network
 */
router.get('/graph/:venueId', isAuthenticated, async (req, res) => {
  try {
    const venueId = parseInt(req.params.venueId);
    
    if (isNaN(venueId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid venue ID format' 
      });
    }
    
    // Get the current venue
    const currentVenue = await db.query.venues.findFirst({
      where: eq(venues.id, venueId),
      columns: {
        id: true,
        name: true,
        city: true,
        region: true,
        latitude: true,
        longitude: true,
        capacity: true,
        primaryGenre: true
      }
    });
    
    if (!currentVenue) {
      return res.status(404).json({ 
        success: false,
        message: 'Venue not found' 
      });
    }
    
    // Get all connections for this venue
    const connections = await db.query.venueConnections.findMany({
      where: eq(venueConnections.venueId, venueId),
      with: {
        connectedVenue: true
      }
    });
    
    // Format the data for the network visualization
    const graphData = {
      nodes: [
        // Add the current venue as the first node
        {
          id: currentVenue.id,
          name: currentVenue.name,
          city: currentVenue.city,
          state: currentVenue.region,
          capacity: currentVenue.capacity,
          lat: currentVenue.latitude,
          lng: currentVenue.longitude,
          genre: currentVenue.primaryGenre,
          isCurrentVenue: true,
          trustScore: 100,
          collaborativeBookings: connections.reduce((total, conn) => total + (conn.collaborativeBookings || 0), 0)
        },
        // Add all connected venues
        ...connections.map(conn => ({
          id: conn.connectedVenue.id,
          name: conn.connectedVenue.name,
          city: conn.connectedVenue.city,
          state: conn.connectedVenue.region,
          capacity: conn.connectedVenue.capacity,
          lat: conn.connectedVenue.latitude,
          lng: conn.connectedVenue.longitude,
          genre: conn.connectedVenue.primaryGenre,
          isCurrentVenue: false,
          trustScore: conn.trustScore || 50,
          collaborativeBookings: conn.collaborativeBookings || 0
        }))
      ],
      links: connections.map(conn => ({
        source: currentVenue.id,
        target: conn.connectedVenue.id,
        value: conn.collaborativeBookings || 1,
        status: conn.status || 'active'
      }))
    };
    
    return res.json(graphData);
  } catch (error) {
    console.error('Error generating venue network graph:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to generate venue network graph' 
    });
  }
});

/**
 * Create a new venue connection
 */
router.post('/connections', isAuthenticated, async (req, res) => {
  try {
    const { venueId, connectedVenueId, status, trustScore, collaborativeBookings } = req.body;
    
    if (!venueId || !connectedVenueId) {
      return res.status(400).json({
        success: false,
        message: 'Both venueId and connectedVenueId are required'
      });
    }
    
    // Check if the connection already exists
    const existingConnection = await db.query.venueConnections.findFirst({
      where: and(
        eq(venueConnections.venueId, venueId),
        eq(venueConnections.connectedVenueId, connectedVenueId)
      )
    });
    
    if (existingConnection) {
      return res.status(409).json({
        success: false,
        message: 'This connection already exists'
      });
    }
    
    // Create the new connection
    await db.insert(venueConnections).values({
      venueId,
      connectedVenueId,
      status: status || 'pending',
      trustScore: trustScore || 50,
      collaborativeBookings: collaborativeBookings || 0
    });
    
    return res.status(201).json({
      success: true,
      message: 'Venue connection created successfully'
    });
  } catch (error) {
    console.error('Error creating venue connection:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create venue connection'
    });
  }
});

export default router;