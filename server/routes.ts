import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertVenueSchema, insertArtistSchema, insertEventSchema, 
         insertVenueNetworkSchema, insertPredictionSchema, insertInquirySchema, 
         insertCollaborativeOpportunitySchema, insertCollaborativeParticipantSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

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

  // Venues routes
  app.get("/api/venues", async (req, res) => {
    try {
      const venues = await storage.getVenues();
      res.json(venues);
    } catch (error) {
      res.status(500).json({ error: "Failed to get venues" });
    }
  });

  app.get("/api/venues/:id", async (req, res) => {
    try {
      const venue = await storage.getVenue(Number(req.params.id));
      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }
      res.json(venue);
    } catch (error) {
      res.status(500).json({ error: "Failed to get venue" });
    }
  });

  app.post("/api/venues", validateRequest(insertVenueSchema), async (req, res) => {
    try {
      const venue = await storage.createVenue(req.body);
      res.status(201).json(venue);
    } catch (error) {
      res.status(500).json({ error: "Failed to create venue" });
    }
  });

  app.patch("/api/venues/:id", async (req, res) => {
    try {
      const venue = await storage.updateVenue(Number(req.params.id), req.body);
      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }
      res.json(venue);
    } catch (error) {
      res.status(500).json({ error: "Failed to update venue" });
    }
  });

  app.get("/api/users/:userId/venues", async (req, res) => {
    try {
      const venues = await storage.getVenuesByUser(Number(req.params.userId));
      res.json(venues);
    } catch (error) {
      res.status(500).json({ error: "Failed to get venues for user" });
    }
  });

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

  // Events routes
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to get events" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEvent(Number(req.params.id));
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to get event" });
    }
  });

  app.post("/api/events", validateRequest(insertEventSchema), async (req, res) => {
    try {
      const event = await storage.createEvent(req.body);
      res.status(201).json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.get("/api/venues/:venueId/events", async (req, res) => {
    try {
      const events = await storage.getEventsByVenue(Number(req.params.venueId));
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to get events for venue" });
    }
  });

  app.get("/api/artists/:artistId/events", async (req, res) => {
    try {
      const events = await storage.getEventsByArtist(Number(req.params.artistId));
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to get events for artist" });
    }
  });

  // Venue Network routes
  app.get("/api/venues/:venueId/connections", async (req, res) => {
    try {
      const connections = await storage.getVenueConnections(Number(req.params.venueId));
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: "Failed to get venue connections" });
    }
  });

  app.post("/api/venue-network", validateRequest(insertVenueNetworkSchema), async (req, res) => {
    try {
      const connection = await storage.createVenueConnection(req.body);
      res.status(201).json(connection);
    } catch (error) {
      res.status(500).json({ error: "Failed to create venue connection" });
    }
  });

  // Predictions routes
  app.get("/api/predictions/:id", async (req, res) => {
    try {
      const prediction = await storage.getPrediction(Number(req.params.id));
      if (!prediction) {
        return res.status(404).json({ error: "Prediction not found" });
      }
      res.json(prediction);
    } catch (error) {
      res.status(500).json({ error: "Failed to get prediction" });
    }
  });

  app.get("/api/venues/:venueId/predictions", async (req, res) => {
    try {
      const predictions = await storage.getPredictionsByVenue(Number(req.params.venueId));
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get predictions for venue" });
    }
  });

  app.post("/api/predictions", validateRequest(insertPredictionSchema), async (req, res) => {
    try {
      const prediction = await storage.createPrediction(req.body);
      res.status(201).json(prediction);
    } catch (error) {
      res.status(500).json({ error: "Failed to create prediction" });
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
  
  // Venue Network endpoints
  app.post("/api/venue-network", validateRequest(insertVenueNetworkSchema), async (req, res) => {
    try {
      const connection = await storage.createVenueConnection(req.body);
      res.status(201).json(connection);
    } catch (error) {
      console.error("Failed to create venue connection:", error);
      res.status(500).json({ error: "Failed to create venue connection" });
    }
  });
  
  // Venue Network Graph endpoint
  app.get("/api/venue-network/graph/:venueId", async (req, res) => {
    try {
      const venueId = Number(req.params.venueId);
      const venue = await storage.getVenue(venueId);
      
      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }
      
      // Get all connections for this venue
      const connections = await storage.getVenueConnections(venueId);
      
      // Get details of all connected venues
      const connectedVenueIds = connections.map(c => c.connectedVenueId);
      const venuesPromises = connectedVenueIds.map(id => storage.getVenue(id));
      const connectedVenuesResults = await Promise.all(venuesPromises);
      const connectedVenues = connectedVenuesResults.filter((v): v is typeof v & { id: number } => v !== undefined);
      
      // Format data for network visualization
      const networkData = {
        nodes: [
          {
            id: venue.id,
            name: venue.name,
            city: venue.city,
            state: venue.state,
            isCurrentVenue: true,
            collaborativeBookings: connections.reduce((sum, conn) => sum + (conn.collaborativeBookings ?? 0), 0),
            trustScore: connections.length > 0 
              ? Math.round(connections.reduce((sum, conn) => sum + (conn.trustScore ?? 0), 0) / connections.length) 
              : 0
          },
          ...connectedVenues.map((v) => {
            const connection = connections.find(c => c.connectedVenueId === v.id);
            return {
              id: v.id,
              name: v.name,
              city: v.city,
              state: v.state,
              isCurrentVenue: false,
              collaborativeBookings: connection ? (connection.collaborativeBookings ?? 0) : 0,
              trustScore: connection ? (connection.trustScore ?? 0) : 0
            };
          })
        ],
        links: connections.map(connection => ({
          source: venueId,
          target: connection.connectedVenueId,
          value: connection.collaborativeBookings ?? 1
        }))
      };
      
      res.json(networkData);
    } catch (error) {
      console.error("Failed to get venue network graph:", error);
      res.status(500).json({ error: "Failed to get venue network graph" });
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
