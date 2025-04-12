import express from 'express';
import { db } from '../db';
import { venues, venueNetwork } from '../../shared/schema';
import { eq, and, like, or, isNotNull } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth-middleware';

const router = express.Router();

/**
 * Get default venue network graph for demo
 * Returns a demo dataset with sample venues and connections
 */
router.get('/graph', async (req, res) => {
  try {
    // Demo mode - return a sample dataset
    const demoVenues = await db.query.venues.findMany({
      limit: 10,
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
    
    if (demoVenues.length === 0) {
      return res.json({
        nodes: [],
        links: []
      });
    }
    
    // Use the first venue as the current venue
    const currentVenue = demoVenues[0];
    
    // Create demo links between the first venue and others
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
          collaborativeBookings: 15
        },
        // Add all other venues as connected venues
        ...demoVenues.slice(1).map((venue, index) => ({
          id: venue.id,
          name: venue.name,
          city: venue.city,
          state: venue.region,
          capacity: venue.capacity,
          lat: venue.latitude,
          lng: venue.longitude,
          genre: venue.primaryGenre,
          isCurrentVenue: false,
          trustScore: 60 + (index * 5) % 40, // Random-ish trust score between 60-100
          collaborativeBookings: 3 + index
        }))
      ],
      links: demoVenues.slice(1).map((venue, index) => ({
        source: currentVenue.id,
        target: venue.id,
        value: 3 + index,
        status: 'active'
      }))
    };
    
    return res.json(graphData);
  } catch (error) {
    console.error('Error generating demo venue network graph:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to generate demo venue network graph' 
    });
  }
});

/**
 * Get venue network graph for visualization
 * Returns nodes (venues) and links (connections) for the specified venue's network
 */
router.get('/graph/:venueId', async (req, res) => {
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
    const connections = await db.query.venueNetwork.findMany({
      where: eq(venueNetwork.venueId, venueId),
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
 * In demo mode, no authentication is required
 */
router.post('/connections', async (req, res) => {
  try {
    const { venueId, connectedVenueId, status, trustScore, collaborativeBookings } = req.body;
    
    if (!venueId || !connectedVenueId) {
      return res.status(400).json({
        success: false,
        message: 'Both venueId and connectedVenueId are required'
      });
    }
    
    // Check if the connection already exists
    const existingConnection = await db.query.venueNetwork.findFirst({
      where: and(
        eq(venueNetwork.venueId, venueId),
        eq(venueNetwork.connectedVenueId, connectedVenueId)
      )
    });
    
    if (existingConnection) {
      return res.status(409).json({
        success: false,
        message: 'This connection already exists'
      });
    }
    
    // Create the new connection
    await db.insert(venueNetwork).values({
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

/**
 * Get all venues for network map
 * Returns all venues with valid coordinates and optional filtering
 */
router.get('/all-venues', async (req, res) => {
  try {
    // Get query parameters for filtering
    const { genre, capacity, region, marketCategory, venueType } = req.query;
    
    console.log('Received venue network filter request with params:', { 
      genre, capacity, region, marketCategory, venueType 
    });
    
    // Build the where clause based on filters
    let whereClause = isNotNull(venues.latitude) && isNotNull(venues.longitude);
    
    if (genre && genre !== 'all') {
      whereClause = and(whereClause, eq(venues.primaryGenre, genre as string));
    }
    
    if (capacity && capacity !== 'all') {
      whereClause = and(whereClause, eq(venues.capacityCategory, capacity as string));
    }
    
    if (region && region !== 'all') {
      whereClause = and(whereClause, eq(venues.region, region as string));
    }
    
    if (marketCategory && marketCategory !== 'all') {
      whereClause = and(whereClause, eq(venues.marketCategory, marketCategory as string));
    }
    
    if (venueType && venueType !== 'all') {
      whereClause = and(whereClause, eq(venues.venueType, venueType as string));
    }
    
    // Get all venues with valid coordinates that match filters
    const allVenues = await db.query.venues.findMany({
      where: whereClause,
      columns: {
        id: true,
        name: true,
        city: true,
        region: true,
        latitude: true,
        longitude: true,
        capacity: true,
        capacityCategory: true,
        primaryGenre: true,
        venueType: true,
        marketCategory: true
      }
    });
    
    console.log(`Found ${allVenues.length} venues matching filters:`, req.query);
    
    if (allVenues.length === 0) {
      console.log('No venues found with the selected filters');
      return res.json({
        nodes: [],
        links: []
      });
    }
    
    // Get all venue connections to create links
    const connections = await db.query.venueNetwork.findMany({
      with: {
        venue: true,
        connectedVenue: true
      }
    });
    
    // Create a map of venue IDs to trust scores and collaborative bookings
    const connectionMap = new Map();
    connections.forEach(conn => {
      // Store connection data for both sides of the connection
      const key1 = `${conn.venueId}-${conn.connectedVenueId}`;
      connectionMap.set(key1, {
        trustScore: conn.trustScore || 50,
        collaborativeBookings: conn.collaborativeBookings || 0
      });
      
      const key2 = `${conn.connectedVenueId}-${conn.venueId}`;
      connectionMap.set(key2, {
        trustScore: conn.trustScore || 50,
        collaborativeBookings: conn.collaborativeBookings || 0
      });
    });
    
    // Format the data for the network visualization
    const graphData = {
      nodes: allVenues.map(venue => ({
        id: venue.id,
        name: venue.name,
        city: venue.city,
        state: venue.region,
        capacity: venue.capacity,
        capacityCategory: venue.capacityCategory,
        lat: venue.latitude,
        lng: venue.longitude,
        genre: venue.primaryGenre,
        venueType: venue.venueType,
        marketCategory: venue.marketCategory,
        isCurrentVenue: false, // None are considered "current" in the all-venues view
        trustScore: 50, // Default trust score
        collaborativeBookings: 0 // Default collaborative bookings
      })),
      links: connections.map(conn => ({
        source: conn.venueId,
        target: conn.connectedVenueId,
        value: conn.collaborativeBookings || 1,
        status: conn.status || 'active'
      }))
    };
    
    return res.json(graphData);
  } catch (error) {
    console.error('Error fetching all venues for network map:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to fetch venues for network map' 
    });
  }
});

export default router;