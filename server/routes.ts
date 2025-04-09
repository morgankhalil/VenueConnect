import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertVenueSchema, insertArtistSchema, insertEventSchema, 
         insertVenueNetworkSchema, insertPredictionSchema, insertInquirySchema, 
         insertCollaborativeOpportunitySchema, insertCollaborativeParticipantSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { Router } from 'express';
import { db } from './db';
import { eq, and, sql } from 'drizzle-orm';
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
router.post('/venue-network', async (req, res) => {
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

router.get('/venue-network/graph/:id', async (req, res) => {
  const venueId = parseInt(req.params.id);
  
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
  
  // Fetch connected venues
  const connectedVenues = await db
    .select()
    .from(venues)
    .where(sql`id = ANY(${connectedVenueIds})`);

  const networkVenues = [
    { ...mainVenue[0], isCurrentVenue: true },
    ...connectedVenues.map(venue => ({ ...venue, isCurrentVenue: false }))
  ];

  const nodes = networkVenues.map(venue => ({
    id: venue.id,
    name: venue.name,
    city: venue.city,
    state: venue.state,
    isCurrentVenue: venue.isCurrentVenue,
    collaborativeBookings: connections.find(c => c.connectedVenueId === venue.id)?.collaborativeBookings || 0,
    trustScore: connections.find(c => c.connectedVenueId === venue.id)?.trustScore || 0,
    latitude: venue.latitude,
    longitude: venue.longitude
  }));

  const links = connections.map(conn => ({
    source: conn.venueId,
    target: conn.connectedVenueId,
    value: conn.collaborativeBookings || 1
  }));

  res.json({ nodes, links });
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

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}

export default router;