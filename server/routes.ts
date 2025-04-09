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
import { venues, artists, events, predictions, collaborativeOpportunities, collaborativeParticipants, venueNetwork } from '../shared/schema';

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

// Venue Network
router.get('/venue-network/graph/:id', async (req, res) => {
  const connections = await db
    .select()
    .from(venueNetwork)
    .where(eq(venueNetwork.venueId, parseInt(req.params.id)));

  const connectedVenueIds = connections.map(c => c.connectedVenueId);
  const networkVenues = await db
    .select()
    .from(venues)
    .where(eq(venues.id, parseInt(req.params.id)));

  const nodes = networkVenues.map(venue => ({
    id: venue.id,
    name: venue.name,
    city: venue.city,
    state: venue.state,
    isCurrentVenue: venue.id === parseInt(req.params.id),
    collaborativeBookings: connections.find(c => c.venueId === venue.id)?.collaborativeBookings || 0,
    trustScore: connections.find(c => c.venueId === venue.id)?.trustScore || 0,
    latitude: venue.latitude,
    longitude: venue.longitude
  }));

  const links = connections.map(conn => ({
    source: conn.venueId,
    target: conn.connectedVenueId,
    value: conn.collaborativeBookings
  }));

  res.json({ nodes, links });
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