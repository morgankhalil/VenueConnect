import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

import webhookRouter from './webhooks/webhook-routes';
import { insertUserSchema, insertVenueSchema, insertArtistSchema, insertEventSchema, 
         insertVenueNetworkSchema, insertPredictionSchema, insertInquirySchema, 
         insertCollaborativeOpportunitySchema, insertCollaborativeParticipantSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { Router } from 'express';
import { db } from './db';
import { eq, and, or, sql } from 'drizzle-orm';
import { venues, artists, events, predictions, collaborativeOpportunities, collaborativeParticipants, venueNetwork, messages } from '../shared/schema';

// Import admin and webhook routes
import adminRouter from './routes/admin';
import webhookRouter from './webhooks/webhook-routes';

const router = Router();

// Stats endpoint
router.get('/api/stats', async (req, res) => {
  try {
    const upcomingOpportunities = await db.select({ count: sql<number>`count(*)` })
      .from(predictions)
      .where(eq(predictions.status, 'pending'));

    const confirmedBookings = await db.select({ count: sql<number>`count(*)` })
      .from(events)
      .where(eq(events.status, 'confirmed'));

    const venueNetworkCount = await db.select({ count: sql<number>`count(*)` })
      .from(venueNetwork)
      .where(eq(venueNetwork.status, 'active'));

    const recentInquiries = await db.select({ count: sql<number>`count(*)` })
      .from(collaborativeOpportunities)
      .where(eq(collaborativeOpportunities.status, 'pending'));

    res.json({
      upcomingOpportunities: upcomingOpportunities[0].count,
      confirmedBookings: confirmedBookings[0].count,
      venueNetworkCount: venueNetworkCount[0].count,
      recentInquiries: recentInquiries[0].count
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Venues
router.get('/venues', async (req, res) => {
  const result = await db.select().from(venues);
  res.json(result);
});

router.get('/venues/:id', async (req, res) => {
  const result = await db.select().from(venues).where(eq(venues.id, parseInt(req.params.id)));
  res.json(result[0]);
});

// Connected venues
router.get('/api/venues/connected', async (req, res) => {
  try {
    // Get all connected venues through venue network
    const connections = await db.select({
      connection: venueNetwork,
      venue: venues
    })
    .from(venueNetwork)
    .leftJoin(venues, eq(venueNetwork.connectedVenueId, venues.id))
    .where(eq(venueNetwork.status, 'active'));
    
    // Transform into expected format
    const connectedVenues = connections
      .filter(item => item.venue !== null && item.venue !== undefined)
      .map(item => {
        // We'll cast venue as non-null since we've filtered
        const venue = item.venue as typeof venues.$inferSelect;
        return {
          id: venue.id,
          name: venue.name,
          trustScore: item.connection.trustScore,
          collaborativeBookings: item.connection.collaborativeBookings,
          city: venue.city,
          state: venue.state
        };
      });
    
    res.json(connectedVenues);
  } catch (error) {
    console.error("Error fetching connected venues:", error);
    res.status(500).json({ error: "Failed to get connected venues" });
  }
});

// Events
router.get('/events', async (req, res) => {
  const result = await db.select().from(events);
  res.json(result);
});

router.get('/venues/recent', async (req, res) => {
  const result = await db.select()
    .from(venues)
    .orderBy(sql`created_at DESC`)
    .limit(3);
  res.json(result);
});

router.get('/events/calendar', async (req, res) => {
  const { month, year } = req.query;
  const result = await db.select({
    events: events,
    artist: artists,
    venue: venues
  })
  .from(events)
  .leftJoin(artists, eq(events.artistId, artists.id))
  .leftJoin(venues, eq(events.venueId, venues.id))
  .where(
    and(
      sql`EXTRACT(MONTH FROM ${events.date}) = ${month}`,
      sql`EXTRACT(YEAR FROM ${events.date}) = ${year}`
    )
  );
  res.json(result);
});

router.get('/venues/:id/events', async (req, res) => {
  const result = await db.select().from(events).where(eq(events.venueId, parseInt(req.params.id)));
  res.json(result);
});

// Predictions
router.get('/api/predictions', async (req, res) => {
  try {
    const result = await db
      .select({
        predictions: predictions,
        artist: artists,
        venue: venues
      })
      .from(predictions)
      .leftJoin(artists, eq(predictions.artistId, artists.id))
      .leftJoin(venues, eq(predictions.venueId, venues.id));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch predictions" });
  }
});

// Detailed predictions endpoint with complete artist and venue data
router.get('/api/predictions/details', async (req, res) => {
  try {
    const result = await db
      .select({
        id: predictions.id,
        artistId: predictions.artistId,
        venueId: predictions.venueId,
        suggestedDate: predictions.suggestedDate,
        confidenceScore: predictions.confidenceScore,
        status: predictions.status,
        reasoning: predictions.reasoning,
        createdAt: predictions.createdAt,
        artist: artists,
        venue: venues
      })
      .from(predictions)
      .leftJoin(artists, eq(predictions.artistId, artists.id))
      .leftJoin(venues, eq(predictions.venueId, venues.id));
    
    // Transform the data to make it easier to work with in the frontend
    const transformedResult = result.map(item => ({
      id: item.id,
      artistId: item.artistId,
      venueId: item.venueId,
      suggestedDate: item.suggestedDate,
      confidenceScore: item.confidenceScore,
      status: item.status,
      reasoning: item.reasoning,
      createdAt: item.createdAt,
      artist: item.artist,
      venue: item.venue
    }));
    
    res.json(transformedResult);
  } catch (error) {
    console.error("Error fetching prediction details:", error);
    res.status(500).json({ error: "Failed to fetch prediction details" });
  }
});

router.get('/venues/:id/predictions', async (req, res) => {
  const result = await db
    .select()
    .from(predictions)
    .where(eq(predictions.venueId, parseInt(req.params.id)));
  res.json(result);
});

router.get('/messages', async (req, res) => {
  try {
    const result = await db
      .select()
      .from(messages)
      .orderBy(messages.timestamp);
    res.json(result);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to get messages" });
  }
});

// Venue Network
router.post('/api/venue-network', async (req, res) => {
  const { venueId, connectedVenueId, status, trustScore, collaborativeBookings } = req.body;
  
  try {
    const result = await db.insert(venueNetwork).values({
      venueId,
      connectedVenueId,
      status,
      trustScore,
      collaborativeBookings
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: "Failed to create connection" });
  }
});

router.get('/api/venue-network/graph/:id', async (req, res) => {
  const venueId = parseInt(req.params.id);
  
  try {
    // First get the main venue
    const mainVenue = await db
      .select()
      .from(venues)
      .where(eq(venues.id, venueId))
      .limit(1);

    if (!mainVenue.length) {
      return res.status(404).json({ error: "Venue not found" });
    }

    // Get connections
    const connections = await db
      .select()
      .from(venueNetwork)
      .where(eq(venueNetwork.venueId, venueId));

    // Get connected venues
    const connectedVenueIds = connections.map(c => c.connectedVenueId);
    
    // Use a different approach to get connected venues
    let connectedVenues: any[] = [];
    
    // Fetch each venue individually to avoid type issues
    for (const id of connectedVenueIds) {
      const result = await db
        .select()
        .from(venues)
        .where(eq(venues.id, id));
      
      if (result.length > 0) {
        connectedVenues.push(result[0]);
      }
    }

    // Create nodes for visualization
    const mainVenueNode = {
      id: mainVenue[0].id,
      name: mainVenue[0].name,
      city: mainVenue[0].city,
      state: mainVenue[0].state,
      isCurrentVenue: true,
      collaborativeBookings: 0,
      trustScore: 0,
      latitude: mainVenue[0].latitude,
      longitude: mainVenue[0].longitude
    };

    const connectedNodes = connectedVenues.map(venue => ({
      id: venue.id,
      name: venue.name,
      city: venue.city,
      state: venue.state,
      isCurrentVenue: false,
      collaborativeBookings: connections.find(c => c.connectedVenueId === venue.id)?.collaborativeBookings || 0,
      trustScore: connections.find(c => c.connectedVenueId === venue.id)?.trustScore || 0,
      latitude: venue.latitude,
      longitude: venue.longitude
    }));

    const nodes = [mainVenueNode, ...connectedNodes];

    const links = connections.map(conn => ({
      source: conn.venueId,
      target: conn.connectedVenueId,
      value: conn.collaborativeBookings || 1
    }));

    res.json({ nodes, links });
  } catch (error) {
    console.error("Error fetching venue network graph:", error);
    res.status(500).json({ error: "Failed to fetch venue network data" });
  }
});


// Add API prefix route for venues/id
router.get('/api/venues/:id', async (req, res) => {
  try {
    const venueId = parseInt(req.params.id);
    
    // Check if venueId is a valid number
    if (isNaN(venueId)) {
      return res.status(400).json({ error: "Invalid venue ID" });
    }
    
    const result = await db.select().from(venues).where(eq(venues.id, venueId));
    
    if (result.length === 0) {
      return res.status(404).json({ error: "Venue not found" });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching venue:", error);
    res.status(500).json({ error: "Failed to fetch venue" });
  }
});

// Login route
router.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  
  // For demo purposes, accept admin/admin123 as valid credentials
  if (username === "admin" && password === "admin123") {
    // Set user session data
    if (req.session) {
      req.session.user = {
        id: 6, // ID of an admin user
        name: "Admin User",
        role: "admin",
        venueId: null
      };
    }
    
    return res.json({ 
      success: true, 
      message: "Logged in successfully" 
    });
  }
  
  // Authentication failed
  res.status(401).json({ 
    success: false, 
    message: "Invalid username or password" 
  });
});

// Logout route
router.post("/api/auth/logout", (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ success: false, message: "Could not log out" });
      }
      res.json({ success: true, message: "Logged out successfully" });
    });
  } else {
    res.json({ success: true, message: "No session to destroy" });
  }
});

// Get current user
router.get("/api/user", async (req, res) => {
  try {
    // Get first venue with connected venues relation
    const venue = await db.query.venues.findFirst({
      with: {
        owner: true,
        venueConnections: {
          with: {
            connectedVenue: true
          }
        }
      }
    });
    
    if (venue) {
      // Transform connected venues into expected format
      const connectedVenues = venue.venueConnections.map(connection => ({
        id: connection.connectedVenue.id,
        name: connection.connectedVenue.name,
        trustScore: connection.trustScore,
        collaborativeBookings: connection.collaborativeBookings
      }));

      // Get user role from session or fallback to database
      let role = (req.session && req.session.user) ? req.session.user.role : 'user';
      
      // If no role in session but owner exists, use owner's role
      if (role === 'user' && venue.owner && venue.owner.role) {
        role = venue.owner.role;
        
        // Update session with correct role if we have a session
        if (req.session && req.session.user) {
          req.session.user.role = role;
        }
      }

      res.json({
        id: venue.id,
        name: venue.contactEmail?.split('@')[0] || 'Demo User',
        venueName: venue.name,
        avatar: venue.imageUrl,
        role: role, // Add the role to the response
        connectedVenues
      });
    } else {
      // Fallback data if no venues exist
      res.json({
        id: 1,
        name: "Demo User",
        venueName: "Demo Venue",
        avatar: undefined,
        role: 'user', // Default role
        connectedVenues: []
      });
    }
  
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to get user data" });
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Error handling middleware
  const validateRequest = (schema: z.ZodType<any, any>) => {
    return (req: Request, res: Response, next: Function) => {
      try {
        req.body = schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          res.status(400).json({ error: validationError.message });
        } else {
          res.status(500).json({ error: "Internal server error during validation" });
        }
      }
    };
  };

  // Users routes
  app.post("/api/users", validateRequest(insertUserSchema), async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(Number(req.params.id));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Add API events endpoint
  app.get("/api/events", async (req, res) => {
    try {
      // Get events with artists and venues
      const results = await db
        .select({
          id: events.id,
          artistId: events.artistId,
          venueId: events.venueId,
          date: events.date,
          startTime: events.startTime,
          status: events.status,
          ticketUrl: events.ticketUrl,
          sourceId: events.sourceId,
          sourceName: events.sourceName,
          createdAt: events.createdAt,
          artist: artists,
          venue: venues
        })
        .from(events)
        .leftJoin(artists, eq(events.artistId, artists.id))
        .leftJoin(venues, eq(events.venueId, venues.id));

      // Transform to a more frontend-friendly format
      const transformedResults = results.map(result => ({
        id: result.id,
        title: result.artist?.name || 'Unnamed Event',
        artistId: result.artistId,
        venueId: result.venueId,
        date: result.date,
        startTime: result.startTime,
        status: result.status,
        ticketUrl: result.ticketUrl,
        sourceId: result.sourceId,
        sourceName: result.sourceName,
        createdAt: result.createdAt,
        artist: result.artist,
        venue: result.venue,
        type: result.status,
        description: `${result.artist?.name || 'Unknown Artist'} at ${result.venue?.name || 'Unknown Venue'}`
      }));
      
      res.json(transformedResults);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.use(router);
  
  // Mount admin routes
  app.use('/api/admin', adminRouter);
  
  // Mount webhook routes
  app.use('/api/webhooks', webhookRouter);

  // Artists routes
  app.get("/api/artists", async (req, res) => {
    try {
      const filter = req.query.filter as string | undefined;
      const artists = await storage.getArtists(filter);
      res.json(artists);
    } catch (error) {
      res.status(500).json({ error: "Failed to get artists" });
    }
  });

  app.get("/api/artists/:id", async (req, res) => {
    try {
      const artist = await storage.getArtist(Number(req.params.id));
      if (!artist) {
        return res.status(404).json({ error: "Artist not found" });
      }
      res.json(artist);
    } catch (error) {
      res.status(500).json({ error: "Failed to get artist" });
    }
  });

  app.post("/api/artists", validateRequest(insertArtistSchema), async (req, res) => {
    try {
      const artist = await storage.createArtist(req.body);
      res.status(201).json(artist);
    } catch (error) {
      res.status(500).json({ error: "Failed to create artist" });
    }
  });


  // Inquiries routes
  app.post("/api/inquiries", validateRequest(insertInquirySchema), async (req, res) => {
    try {
      const inquiry = await storage.createInquiry(req.body);
      res.status(201).json(inquiry);
    } catch (error) {
      res.status(500).json({ error: "Failed to create inquiry" });
    }
  });

  app.get("/api/venues/:venueId/inquiries", async (req, res) => {
    try {
      const inquiries = await storage.getInquiriesByVenue(Number(req.params.venueId));
      res.json(inquiries);
    } catch (error) {
      res.status(500).json({ error: "Failed to get inquiries for venue" });
    }
  });

  // Collaborative Opportunities routes
  app.post("/api/collaborative-opportunities", validateRequest(insertCollaborativeOpportunitySchema), async (req, res) => {
    try {
      const opportunity = await storage.createCollaborativeOpportunity(req.body);
      res.status(201).json(opportunity);
    } catch (error) {
      res.status(500).json({ error: "Failed to create collaborative opportunity" });
    }
  });

  app.get("/api/venues/:venueId/collaborative-opportunities", async (req, res) => {
    try {
      const opportunities = await storage.getCollaborativeOpportunitiesByVenue(Number(req.params.venueId));
      res.json(opportunities);
    } catch (error) {
      res.status(500).json({ error: "Failed to get collaborative opportunities for venue" });
    }
  });

  // Collaborative Participants routes
  app.post("/api/collaborative-participants", validateRequest(insertCollaborativeParticipantSchema), async (req, res) => {
    try {
      const participant = await storage.addCollaborativeParticipant(req.body);
      res.status(201).json(participant);
    } catch (error) {
      res.status(500).json({ error: "Failed to add collaborative participant" });
    }
  });

  app.get("/api/collaborative-opportunities/:opportunityId/participants", async (req, res) => {
    try {
      const participants = await storage.getCollaborativeParticipantsByOpportunity(Number(req.params.opportunityId));
      res.json(participants);
    } catch (error) {
      res.status(500).json({ error: "Failed to get participants for opportunity" });
    }
  });


  // Tour data endpoint
  app.get("/api/tours", (_, res) => {
    // For now we're returning mock tour data
    // In a production app this would come from external APIs or our database
    const tourGroups = [
      {
        id: "t1",
        name: "Summer East Coast Tour 2025",
        artistName: "The Midnight Hour",
        artistId: "ar1",
        genre: "indie",
        region: "East Coast",
        startDate: "2025-06-01",
        endDate: "2025-07-15",
        totalShows: 12,
        confirmedShows: 8,
        events: [
          {
            id: "e1",
            date: "2025-06-01",
            venue: "Paradise Rock Club",
            city: "Boston, MA",
            isConfirmed: true,
            isRoutingOpportunity: false,
            latitude: 42.3486,
            longitude: -71.1029
          },
          {
            id: "e2",
            date: "2025-06-04",
            venue: "Brooklyn Steel",
            city: "Brooklyn, NY",
            isConfirmed: true,
            isRoutingOpportunity: false,
            latitude: 40.7128,
            longitude: -73.9352
          },
          {
            id: "e3",
            date: "2025-06-08",
            venue: "",
            city: "Philadelphia, PA",
            isConfirmed: false,
            isRoutingOpportunity: true,
            latitude: 39.9526,
            longitude: -75.1652
          },
          {
            id: "e4",
            date: "2025-06-12",
            venue: "9:30 Club",
            city: "Washington, DC",
            isConfirmed: true,
            isRoutingOpportunity: false,
            latitude: 38.9072,
            longitude: -77.0369
          }
        ]
      },
      {
        id: "t2",
        name: "Midwest Tour 2025",
        artistName: "Lunar Eclipse",
        artistId: "ar2",
        genre: "rock",
        region: "Midwest",
        startDate: "2025-07-10",
        endDate: "2025-08-05",
        totalShows: 10,
        confirmedShows: 5,
        events: [
          {
            id: "e5",
            date: "2025-07-10",
            venue: "Metro",
            city: "Chicago, IL",
            isConfirmed: true,
            isRoutingOpportunity: false,
            latitude: 41.8781,
            longitude: -87.6298
          },
          {
            id: "e6",
            date: "2025-07-13",
            venue: "",
            city: "Milwaukee, WI",
            isConfirmed: false,
            isRoutingOpportunity: true,
            latitude: 43.0389,
            longitude: -87.9065
          },
          {
            id: "e7",
            date: "2025-07-18",
            venue: "First Avenue",
            city: "Minneapolis, MN",
            isConfirmed: true,
            isRoutingOpportunity: false,
            latitude: 44.9778,
            longitude: -93.2650
          }
        ]
      }
    ];
    
    res.json(tourGroups);
  });

  // Bandsintown API sync endpoints
  app.post("/api/bandsintown/sync-venues", async (req, res) => {
    try {
      const { venueId, radius, limit } = req.body;
      
      if (!venueId || typeof venueId !== 'number') {
        return res.status(400).json({ error: "Venue ID is required" });
      }
      
      // Import sync function
      const { syncVenuesFromBandsInTown } = await import('./data-sync/bands-in-town-sync');
      
      // Run sync in background to avoid blocking the response
      const syncPromise = syncVenuesFromBandsInTown(venueId, radius || 250, limit || 10);
      
      // Immediately respond that the sync has started
      res.json({ 
        message: `Started venue sync for venue ID: ${venueId}`,
        status: 'processing'
      });
      
      // Continue with the sync
      syncPromise
        .then(venues => {
          console.log(`Completed venue sync for venue ID ${venueId}, processed ${venues.length} venues`);
        })
        .catch(error => {
          console.error(`Error during venue sync for venue ID ${venueId}:`, error);
        });
        
    } catch (error) {
      console.error("Error starting Bandsintown venue sync:", error);
      res.status(500).json({ 
        error: "Failed to start Bandsintown venue sync",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Bandsintown artist sync endpoint
  app.post("/api/bandsintown/sync-artist", async (req, res) => {
    try {
      const { artistName } = req.body;
      
      if (!artistName || typeof artistName !== 'string') {
        return res.status(400).json({ error: "Artist name is required" });
      }
      
      // Import sync function
      const { syncArtistEventsFromBandsInTown } = await import('./data-sync/bands-in-town-sync');
      
      // Run sync in background to avoid blocking the response
      const syncPromise = syncArtistEventsFromBandsInTown(artistName);
      
      // Immediately respond that the sync has started
      res.json({ 
        message: `Started sync for artist: ${artistName}`,
        status: 'processing'
      });
      
      // Continue with the sync
      syncPromise
        .then(events => {
          console.log(`Completed sync for artist ${artistName}, processed ${events.length} events`);
        })
        .catch(error => {
          console.error(`Error during artist sync for ${artistName}:`, error);
        });
        
    } catch (error) {
      console.error("Error starting Bandsintown sync:", error);
      res.status(500).json({ 
        error: "Failed to start Bandsintown sync",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Map config endpoint - now supporting Leaflet configs
  app.get("/api/map-config", (_, res) => {
    // We've migrated to Leaflet for more reliability
    // Send map configuration settings to the client
    const config = {
      defaultCenter: [-96.0, 39.5], // US center coordinates [lng, lat]
      defaultZoom: 3.5,
      tileProvider: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      mapType: 'leaflet'
    };

    console.log("Providing map configuration (OpenStreetMap + Leaflet)");
    res.json(config);
  });
  
  // Public Bandsintown API key configuration status - no admin needed
  app.get("/api/bandsintown/status", (req, res) => {
    const apiKey = process.env.BANDSINTOWN_API_KEY;
    
    if (apiKey) {
      res.json({
        configured: true,
        message: "Bandsintown API key is properly configured"
      });
    } else {
      res.json({
        configured: false,
        message: "Bandsintown API key is not configured. Please add it to your Replit Secrets."
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}

export default router;