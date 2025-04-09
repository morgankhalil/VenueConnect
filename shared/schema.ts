import { pgTable, text, serial, integer, boolean, timestamp, date, pgEnum, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table (existing)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email").notNull().unique(),
  role: text("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Genres enum
export const genreEnum = pgEnum("genre", [
  "rock", "indie", "hip_hop", "electronic", "pop", "folk", "metal", "jazz", "blues", "world", "classical", "country", "other"
]);

// Venues table
export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  country: text("country").notNull(),
  capacity: integer("capacity").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  description: text("description"),
  imageUrl: text("image_url"),
  ownerId: integer("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Artists table
export const artists = pgTable("artists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  genres: genreEnum("genres").array(),
  popularity: integer("popularity"),
  spotifyId: text("spotify_id").unique(),
  bandsintownId: text("bandsintown_id").unique(),
  songkickId: text("songkick_id").unique(),
  imageUrl: text("image_url"),
  description: text("description"),
  websiteUrl: text("website_url"),
  socialMediaLinks: jsonb("social_media_links"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id").references(() => artists.id).notNull(),
  venueId: integer("venue_id").references(() => venues.id).notNull(),
  date: date("date").notNull(),
  startTime: text("start_time"),
  ticketUrl: text("ticket_url"),
  status: text("status").default("confirmed"),
  sourceId: text("source_id"),
  sourceName: text("source_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// VenueNetwork table
export const venueNetwork = pgTable("venue_network", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").references(() => venues.id).notNull(),
  connectedVenueId: integer("connected_venue_id").references(() => venues.id).notNull(),
  status: text("status").default("active"),
  trustScore: integer("trust_score").default(50),
  collaborativeBookings: integer("collaborative_bookings").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Predictions table
export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id").references(() => artists.id).notNull(),
  venueId: integer("venue_id").references(() => venues.id).notNull(),
  suggestedDate: date("suggested_date").notNull(),
  confidenceScore: integer("confidence_score").notNull(),
  status: text("status").default("pending"),
  reasoning: text("reasoning"),
  gapBeforeEvent: integer("gap_before_event_id").references(() => events.id),
  gapAfterEvent: integer("gap_after_event_id").references(() => events.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Inquiries table
export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").references(() => venues.id).notNull(),
  artistId: integer("artist_id").references(() => artists.id).notNull(),
  message: text("message").notNull(),
  proposedDate: date("proposed_date"),
  status: text("status").default("pending"),
  collaborators: integer("collaborators").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// CollaborativeOpportunities table
export const collaborativeOpportunities = pgTable("collaborative_opportunities", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id").references(() => artists.id).notNull(),
  creatorVenueId: integer("creator_venue_id").references(() => venues.id).notNull(),
  dateRangeStart: date("date_range_start").notNull(),
  dateRangeEnd: date("date_range_end").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// CollaborativeParticipants table
export const collaborativeParticipants = pgTable("collaborative_participants", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").references(() => collaborativeOpportunities.id).notNull(),
  venueId: integer("venue_id").references(() => venues.id).notNull(),
  status: text("status").default("pending"),
  proposedDate: date("proposed_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  venues: many(venues),
}));

export const venuesRelations = relations(venues, ({ one, many }) => ({
  owner: one(users, {
    fields: [venues.ownerId],
    references: [users.id],
  }),
  events: many(events),
  predictionsAsVenue: many(predictions),
  venueConnections: many(venueNetwork, { relationName: "venueConnections" }),
  connectedByVenues: many(venueNetwork, { relationName: "connectedByVenues" }),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
  events: many(events),
  predictions: many(predictions),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  artist: one(artists, {
    fields: [events.artistId],
    references: [artists.id],
  }),
  venue: one(venues, {
    fields: [events.venueId],
    references: [venues.id],
  }),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  artist: one(artists, {
    fields: [predictions.artistId],
    references: [artists.id],
  }),
  venue: one(venues, {
    fields: [predictions.venueId],
    references: [venues.id],
  }),
  gapBeforeEventRel: one(events, {
    fields: [predictions.gapBeforeEvent],
    references: [events.id],
  }),
  gapAfterEventRel: one(events, {
    fields: [predictions.gapAfterEvent],
    references: [events.id],
  }),
}));

export const venueNetworkRelations = relations(venueNetwork, ({ one }) => ({
  venue: one(venues, {
    fields: [venueNetwork.venueId],
    references: [venues.id],
    relationName: "venueConnections",
  }),
  connectedVenue: one(venues, {
    fields: [venueNetwork.connectedVenueId],
    references: [venues.id],
    relationName: "connectedByVenues",
  }),
}));

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: integer('sender_id').references(() => users.id),
  receiverId: integer('receiver_id').references(() => users.id),
  content: text('content').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  senderName: text('sender_name').notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
  }),
}));

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  venue: one(venues, {
    fields: [inquiries.venueId],
    references: [venues.id],
  }),
  artist: one(artists, {
    fields: [inquiries.artistId],
    references: [artists.id],
  }),
}));

export const collaborativeOpportunitiesRelations = relations(collaborativeOpportunities, ({ one, many }) => ({
  artist: one(artists, {
    fields: [collaborativeOpportunities.artistId],
    references: [artists.id],
  }),
  creatorVenue: one(venues, {
    fields: [collaborativeOpportunities.creatorVenueId],
    references: [venues.id],
  }),
  participants: many(collaborativeParticipants),
}));

export const collaborativeParticipantsRelations = relations(collaborativeParticipants, ({ one }) => ({
  opportunity: one(collaborativeOpportunities, {
    fields: [collaborativeParticipants.opportunityId],
    references: [collaborativeOpportunities.id],
  }),
  venue: one(venues, {
    fields: [collaborativeParticipants.venueId],
    references: [venues.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertVenueSchema = createInsertSchema(venues).omit({
  id: true,
  createdAt: true,
});

export const insertArtistSchema = createInsertSchema(artists).omit({
  id: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertVenueNetworkSchema = createInsertSchema(venueNetwork).omit({
  id: true,
  createdAt: true,
});

export const insertPredictionSchema = createInsertSchema(predictions).omit({
  id: true,
  createdAt: true,
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  createdAt: true,
});

export const insertCollaborativeOpportunitySchema = createInsertSchema(collaborativeOpportunities).omit({
  id: true,
  createdAt: true,
});

export const insertCollaborativeParticipantSchema = createInsertSchema(collaborativeParticipants).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Venue = typeof venues.$inferSelect;
export type InsertVenue = z.infer<typeof insertVenueSchema>;

export type Artist = typeof artists.$inferSelect;
export type InsertArtist = z.infer<typeof insertArtistSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type VenueNetwork = typeof venueNetwork.$inferSelect;
export type InsertVenueNetwork = z.infer<typeof insertVenueNetworkSchema>;

export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;

export type CollaborativeOpportunity = typeof collaborativeOpportunities.$inferSelect;
export type InsertCollaborativeOpportunity = z.infer<typeof insertCollaborativeOpportunitySchema>;

export type CollaborativeParticipant = typeof collaborativeParticipants.$inferSelect;
export type InsertCollaborativeParticipant = z.infer<typeof insertCollaborativeParticipantSchema>;
