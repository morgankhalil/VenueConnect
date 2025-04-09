import { 
  users, type User, type InsertUser, 
  venues, type Venue, type InsertVenue,
  artists, type Artist, type InsertArtist,
  events, type Event, type InsertEvent,
  venueNetwork, type VenueNetwork, type InsertVenueNetwork,
  predictions, type Prediction, type InsertPrediction,
  inquiries, type Inquiry, type InsertInquiry,
  collaborativeOpportunities, type CollaborativeOpportunity, type InsertCollaborativeOpportunity,
  collaborativeParticipants, type CollaborativeParticipant, type InsertCollaborativeParticipant,
  networkAgents, type NetworkAgent, type InsertNetworkAgent
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, like, desc, SQL } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Venue methods
  getVenue(id: number): Promise<Venue | undefined>;
  getVenues(): Promise<Venue[]>;
  getVenuesByUser(userId: number): Promise<Venue[]>;
  createVenue(venue: InsertVenue): Promise<Venue>;
  updateVenue(id: number, venue: Partial<InsertVenue>): Promise<Venue | undefined>;
  
  // Artist methods
  getArtist(id: number): Promise<Artist | undefined>;
  getArtists(filter?: string): Promise<Artist[]>;
  createArtist(artist: InsertArtist): Promise<Artist>;
  
  // Event methods
  getEvent(id: number): Promise<Event | undefined>;
  getEvents(): Promise<Event[]>;
  getEventsByVenue(venueId: number): Promise<Event[]>;
  getEventsByArtist(artistId: number): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  
  // Venue Network methods
  getVenueConnections(venueId: number): Promise<VenueNetwork[]>;
  createVenueConnection(connection: InsertVenueNetwork): Promise<VenueNetwork>;
  
  // Prediction methods
  getPrediction(id: number): Promise<Prediction | undefined>;
  getPredictionsByVenue(venueId: number): Promise<Prediction[]>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  
  // Inquiry methods
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  getInquiriesByVenue(venueId: number): Promise<Inquiry[]>;
  
  // Collaborative Opportunity methods
  createCollaborativeOpportunity(opportunity: InsertCollaborativeOpportunity): Promise<CollaborativeOpportunity>;
  getCollaborativeOpportunitiesByVenue(venueId: number): Promise<CollaborativeOpportunity[]>;
  
  // Collaborative Participant methods
  addCollaborativeParticipant(participant: InsertCollaborativeParticipant): Promise<CollaborativeParticipant>;
  getCollaborativeParticipantsByOpportunity(opportunityId: number): Promise<CollaborativeParticipant[]>;
  
  // Network Agent methods
  createNetworkAgent(agent: InsertNetworkAgent): Promise<NetworkAgent>;
  getNetworkAgentsByVenue(venueId: number): Promise<NetworkAgent[]>;
  getNetworkAgent(id: number): Promise<NetworkAgent | undefined>;
  updateNetworkAgent(id: number, agent: Partial<InsertNetworkAgent>): Promise<NetworkAgent | undefined>;
  deleteNetworkAgent(id: number): Promise<void>;
  updateAgentLastRun(id: number): Promise<NetworkAgent | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  
  // Venue methods
  async getVenue(id: number): Promise<Venue | undefined> {
    const [venue] = await db.select().from(venues).where(eq(venues.id, id));
    return venue;
  }
  
  async getVenues(): Promise<Venue[]> {
    return await db.select().from(venues);
  }
  
  async getVenuesByUser(userId: number): Promise<Venue[]> {
    return await db.select().from(venues).where(eq(venues.ownerId, userId));
  }
  
  async createVenue(venue: InsertVenue): Promise<Venue> {
    const [newVenue] = await db.insert(venues).values(venue).returning();
    return newVenue;
  }
  
  async updateVenue(id: number, venue: Partial<InsertVenue>): Promise<Venue | undefined> {
    const [updatedVenue] = await db
      .update(venues)
      .set(venue)
      .where(eq(venues.id, id))
      .returning();
    return updatedVenue;
  }
  
  // Artist methods
  async getArtist(id: number): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.id, id));
    return artist;
  }
  
  async getArtists(filter?: string): Promise<Artist[]> {
    if (filter) {
      return await db
        .select()
        .from(artists)
        .where(like(artists.name, `%${filter}%`));
    }
    return await db.select().from(artists);
  }
  
  async createArtist(artist: InsertArtist): Promise<Artist> {
    const [newArtist] = await db.insert(artists).values(artist).returning();
    return newArtist;
  }
  
  // Event methods
  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }
  
  async getEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }
  
  async getEventsByVenue(venueId: number): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(eq(events.venueId, venueId))
      .orderBy(events.date);
  }
  
  async getEventsByArtist(artistId: number): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(eq(events.artistId, artistId))
      .orderBy(events.date);
  }
  
  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }
  
  // Venue Network methods
  async getVenueConnections(venueId: number): Promise<VenueNetwork[]> {
    return await db
      .select()
      .from(venueNetwork)
      .where(eq(venueNetwork.venueId, venueId));
  }
  
  async createVenueConnection(connection: InsertVenueNetwork): Promise<VenueNetwork> {
    const [newConnection] = await db.insert(venueNetwork).values(connection).returning();
    return newConnection;
  }
  
  // Prediction methods
  async getPrediction(id: number): Promise<Prediction | undefined> {
    const [prediction] = await db.select().from(predictions).where(eq(predictions.id, id));
    return prediction;
  }
  
  async getPredictionsByVenue(venueId: number): Promise<Prediction[]> {
    return await db
      .select()
      .from(predictions)
      .where(eq(predictions.venueId, venueId))
      .orderBy(desc(predictions.confidenceScore));
  }
  
  async createPrediction(prediction: InsertPrediction): Promise<Prediction> {
    const [newPrediction] = await db.insert(predictions).values(prediction).returning();
    return newPrediction;
  }
  
  // Inquiry methods
  async createInquiry(inquiry: InsertInquiry): Promise<Inquiry> {
    const [newInquiry] = await db.insert(inquiries).values(inquiry).returning();
    return newInquiry;
  }
  
  async getInquiriesByVenue(venueId: number): Promise<Inquiry[]> {
    return await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.venueId, venueId))
      .orderBy(desc(inquiries.createdAt));
  }
  
  // Collaborative Opportunity methods
  async createCollaborativeOpportunity(opportunity: InsertCollaborativeOpportunity): Promise<CollaborativeOpportunity> {
    const [newOpportunity] = await db.insert(collaborativeOpportunities).values(opportunity).returning();
    return newOpportunity;
  }
  
  async getCollaborativeOpportunitiesByVenue(venueId: number): Promise<CollaborativeOpportunity[]> {
    return await db
      .select()
      .from(collaborativeOpportunities)
      .where(eq(collaborativeOpportunities.creatorVenueId, venueId))
      .orderBy(desc(collaborativeOpportunities.createdAt));
  }
  
  // Collaborative Participant methods
  async addCollaborativeParticipant(participant: InsertCollaborativeParticipant): Promise<CollaborativeParticipant> {
    const [newParticipant] = await db.insert(collaborativeParticipants).values(participant).returning();
    return newParticipant;
  }
  
  async getCollaborativeParticipantsByOpportunity(opportunityId: number): Promise<CollaborativeParticipant[]> {
    return await db
      .select()
      .from(collaborativeParticipants)
      .where(eq(collaborativeParticipants.opportunityId, opportunityId));
  }
  
  // Network Agent methods
  async createNetworkAgent(agent: InsertNetworkAgent): Promise<NetworkAgent> {
    const [newAgent] = await db.insert(networkAgents).values(agent).returning();
    return newAgent;
  }
  
  async getNetworkAgentsByVenue(venueId: number): Promise<NetworkAgent[]> {
    return await db
      .select()
      .from(networkAgents)
      .where(eq(networkAgents.venueId, venueId))
      .orderBy(desc(networkAgents.lastRun));
  }
  
  async getNetworkAgent(id: number): Promise<NetworkAgent | undefined> {
    const [agent] = await db.select().from(networkAgents).where(eq(networkAgents.id, id));
    return agent;
  }
  
  async updateNetworkAgent(id: number, agent: Partial<InsertNetworkAgent>): Promise<NetworkAgent | undefined> {
    const [updatedAgent] = await db
      .update(networkAgents)
      .set(agent)
      .where(eq(networkAgents.id, id))
      .returning();
    return updatedAgent;
  }
  
  async deleteNetworkAgent(id: number): Promise<void> {
    await db.delete(networkAgents).where(eq(networkAgents.id, id));
  }
  
  async updateAgentLastRun(id: number): Promise<NetworkAgent | undefined> {
    const [updatedAgent] = await db
      .update(networkAgents)
      .set({ lastRun: new Date() })
      .where(eq(networkAgents.id, id))
      .returning();
    return updatedAgent;
  }
}

export const storage = new DatabaseStorage();
