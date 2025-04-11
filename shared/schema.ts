import { pgTable, text, serial, integer, boolean, timestamp, date, pgEnum, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User role enum
export const userRoleEnum = pgEnum("user_role", [
  "admin",               // Full system access
  "venue_manager",       // Can manage venue details, events, and bookings
  "artist_manager",      // Can manage artist profiles and tour schedules
  "booking_agent",       // Can create and manage bookings across venues
  "staff",               // Limited venue or artist access
  "user"                 // Basic access
]);

// Define permissions for each role
export const rolePermissions = {
  admin: {
    canManageUsers: true,
    canManageVenues: true,
    canManageArtists: true,
    canManageTours: true,
    canViewAnalytics: true,
    canSendMessages: true,
    canViewAllVenueData: true,
    canCreateWebhooks: true,
  },
  venue_manager: {
    canManageUsers: false,
    canManageVenues: true,
    canManageArtists: false,
    canManageTours: true,
    canViewAnalytics: true,
    canSendMessages: true,
    canViewAllVenueData: false,
    canCreateWebhooks: true,
  },
  artist_manager: {
    canManageUsers: false,
    canManageVenues: false,
    canManageArtists: true,
    canManageTours: true,
    canViewAnalytics: true,
    canSendMessages: true,
    canViewAllVenueData: false,
    canCreateWebhooks: true,
  },
  booking_agent: {
    canManageUsers: false,
    canManageVenues: false,
    canManageArtists: false,
    canManageTours: true,
    canViewAnalytics: true,
    canSendMessages: true,
    canViewAllVenueData: false,
    canCreateWebhooks: false,
  },
  staff: {
    canManageUsers: false,
    canManageVenues: false,
    canManageArtists: false,
    canManageTours: false,
    canViewAnalytics: false,
    canSendMessages: true,
    canViewAllVenueData: false,
    canCreateWebhooks: false,
  },
  user: {
    canManageUsers: false,
    canManageVenues: false,
    canManageArtists: false,
    canManageTours: false,
    canViewAnalytics: false,
    canSendMessages: false,
    canViewAllVenueData: false,
    canCreateWebhooks: false,
  }
};

// Users table with enhanced roles
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email").notNull().unique(),
  role: text("role").default("user"),  // Using text for backward compatibility
  // The following fields enhance the user profile
  artistId: integer("artist_id").references(() => artists.id),
  contactPhone: text("contact_phone"),
  profileImageUrl: text("profile_image_url"),
  bio: text("bio"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Genres enum
export const genreEnum = pgEnum("genre", [
  "rock", "indie", "hip_hop", "electronic", "pop", "folk", "metal", "jazz", "blues", 
  "world", "classical", "country", "punk", "experimental", "alternative", "rnb", "soul",
  "reggae", "ambient", "techno", "house", "disco", "funk", "country", "other"
]);

// Market category enum
export const marketCategoryEnum = pgEnum("market_category", [
  "primary", "secondary", "tertiary"
]);

// Venue type enum
export const venueTypeEnum = pgEnum("venue_type", [
  "club", "bar", "theater", "coffeehouse", "diy_space", "art_gallery", "college_venue", "community_center", "record_store"
]);

// Venue capacity category enum
export const capacityCategoryEnum = pgEnum("capacity_category", [
  "tiny", "small", "medium", "large"
]);

// Venues table
export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  region: text("region"), // State/province/region
  country: text("country").default('US'),
  latitude: real("latitude"),
  longitude: real("longitude"),
  // Geographic categorization
  marketCategory: marketCategoryEnum("market_category"), // primary, secondary, tertiary
  
  // Venue details
  venueType: venueTypeEnum("venue_type"), // club, bar, theater, etc.
  capacity: integer("capacity"),
  capacityCategory: capacityCategoryEnum("capacity_category"), // tiny, small, medium, large
  
  // Genre specialization
  primaryGenre: genreEnum("primary_genre"),
  secondaryGenres: genreEnum("secondary_genres").array(),
  
  // Booking details for indie venues
  bookingContactName: text("booking_contact_name"),
  bookingEmail: text("booking_email"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  typicalBookingLeadTime: integer("typical_booking_lead_time_days"), // How many days in advance they typically book
  paymentStructure: text("payment_structure"), // guarantee, door split, etc.
  soundSystem: text("sound_system"), // Description of sound system quality
  
  // Local support for touring artists
  localAccommodation: boolean("local_accommodation"), // Whether they offer crash spots
  localPromotion: boolean("local_promotion"), // Whether they help with promotion
  
  // Additional venue information
  description: text("description"),
  ageRestriction: text("age_restriction"), // All-ages, 18+, 21+
  websiteUrl: text("website_url"),
  imageUrl: text("image_url"),
  socialMediaLinks: jsonb("social_media_links"),
  
  // External IDs for future synchronization
  bandsintownId: text("bandsintown_id").unique(),
  songkickId: text("songkick_id").unique(),
  
  // Ownership and tracking
  ownerId: integer("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
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
export const usersRelations = relations(users, ({ many }) => ({}));

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
    relationName: "venueConnections"
  }),
  connectedVenue: one(venues, {
    fields: [venueNetwork.connectedVenueId],
    references: [venues.id],
    relationName: "connectedByVenues"
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

// Define webhook configurations table
export const webhookConfigurations = pgTable('webhook_configurations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // e.g., 'bandsintown_events', 'artist_updates', etc.
  description: text('description'),
  callbackUrl: text('callback_url').notNull(),
  isEnabled: boolean('is_enabled').default(false),
  secretKey: text('secret_key'),
  configOptions: text('config_options'),
  lastExecuted: timestamp('last_executed'),
  createdAt: timestamp('created_at').defaultNow()
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

// Add schema and type for webhook configurations
export const insertWebhookConfigurationSchema = createInsertSchema(webhookConfigurations).omit({
  id: true,
  createdAt: true,
});

export type WebhookConfiguration = typeof webhookConfigurations.$inferSelect;
export type InsertWebhookConfiguration = z.infer<typeof insertWebhookConfigurationSchema>;

// Tour optimization tables
export const tours = pgTable("tours", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  artistId: integer("artist_id").references(() => artists.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").default("planning"), // planning, booking, confirmed, completed, cancelled
  description: text("description"),
  totalBudget: real("total_budget"),
  estimatedTravelDistance: real("estimated_travel_distance"),
  estimatedTravelTime: integer("estimated_travel_time_minutes"),
  // Initial score metrics (before optimization)
  initialOptimizationScore: integer("initial_optimization_score"),
  initialTotalDistance: real("initial_total_distance"),
  initialTravelTime: integer("initial_travel_time_minutes"),
  // Final optimization score (after optimization)
  optimizationScore: integer("optimization_score"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Create enum for tour venue status
export const tourVenueStatusEnum = pgEnum("tour_venue_status", [
  "potential",    // Manually added to tour but no contact made
  "suggested",    // Suggested by optimization engine
  "contacted",    // Initial outreach made to venue
  "negotiating",  // Active discussions about booking
  "hold1",        // Priority 1 Hold (Highest priority artist/band)
  "hold2",        // Priority 2 Hold (High priority artist/band)
  "hold3",        // Priority 3 Hold (Medium priority artist/band)
  "hold4",        // Priority 4 Hold (Lower priority artist/band)
  "confirmed",    // Booking is fully confirmed
  "cancelled"     // No longer part of the tour
]);

export const tourVenues = pgTable("tour_venues", {
  id: serial("id").primaryKey(),
  tourId: integer("tour_id").references(() => tours.id).notNull(),
  venueId: integer("venue_id").references(() => venues.id).notNull(),
  date: date("date"),
  // Using text instead of the enum for now to maintain compatibility with existing data
  // Can be migrated to use the enum in a future update
  status: text("status").default("potential"), // See tourVenueStatusEnum for valid values
  sequence: integer("sequence"), // Order in the tour
  travelDistanceFromPrevious: real("travel_distance_from_previous"),
  travelTimeFromPrevious: integer("travel_time_from_previous"), // in minutes
  notes: text("notes"),
  statusUpdatedAt: timestamp("status_updated_at"), // Track when status changes
  createdAt: timestamp("created_at").defaultNow(),
});

export const tourGaps = pgTable("tour_gaps", {
  id: serial("id").primaryKey(),
  tourId: integer("tour_id").references(() => tours.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  previousVenueId: integer("previous_venue_id").references(() => venues.id),
  nextVenueId: integer("next_venue_id").references(() => venues.id),
  locationLatitude: real("location_latitude"),
  locationLongitude: real("location_longitude"),
  maxTravelDistance: real("max_travel_distance"),
  status: text("status").default("open"), // open, filled, skipped
  createdAt: timestamp("created_at").defaultNow(),
});

export const tourGapSuggestions = pgTable("tour_gap_suggestions", {
  id: serial("id").primaryKey(),
  gapId: integer("gap_id").references(() => tourGaps.id).notNull(),
  venueId: integer("venue_id").references(() => venues.id).notNull(),
  suggestedDate: date("suggested_date").notNull(),
  matchScore: integer("match_score").default(50),
  travelDistanceFromPrevious: real("travel_distance_from_previous"),
  travelDistanceToNext: real("travel_distance_to_next"),
  status: text("status").default("suggested"), // suggested, accepted, rejected
  createdAt: timestamp("created_at").defaultNow(),
});

export const artistTourPreferences = pgTable("artist_tour_preferences", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id").references(() => artists.id).notNull(),
  preferredRegions: text("preferred_regions").array(),
  preferredVenueTypes: text("preferred_venue_types").array(),
  preferredVenueCapacity: jsonb("preferred_venue_capacity"), // { min, max }
  maxTravelDistancePerDay: real("max_travel_distance_per_day"),
  minDaysBetweenShows: integer("min_days_between_shows").default(0),
  maxDaysBetweenShows: integer("max_days_between_shows"),
  avoidDates: jsonb("avoid_dates").array(),
  requiredDayOff: text("required_day_off").array(), // e.g., ["Sunday", "Monday"]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const venueTourPreferences = pgTable("venue_tour_preferences", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").references(() => venues.id).notNull(),
  preferredGenres: genreEnum("preferred_genres").array(),
  availableDates: jsonb("available_dates").array(),
  minimumArtistPopularity: integer("minimum_artist_popularity"),
  preferredNoticeTime: integer("preferred_notice_time_days"),
  openToCollaboration: boolean("open_to_collaboration").default(true),
  participationRadius: real("participation_radius"), // max distance in km for tour collaboration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Relations for tour optimization
export const toursRelations = relations(tours, ({ one, many }) => ({
  artist: one(artists, {
    fields: [tours.artistId],
    references: [artists.id],
  }),
  venues: many(tourVenues),
  gaps: many(tourGaps),
}));

export const tourVenuesRelations = relations(tourVenues, ({ one }) => ({
  tour: one(tours, {
    fields: [tourVenues.tourId],
    references: [tours.id],
  }),
  venue: one(venues, {
    fields: [tourVenues.venueId],
    references: [venues.id],
  }),
}));

export const tourGapsRelations = relations(tourGaps, ({ one, many }) => ({
  tour: one(tours, {
    fields: [tourGaps.tourId],
    references: [tours.id],
  }),
  previousVenue: one(venues, {
    fields: [tourGaps.previousVenueId],
    references: [venues.id],
  }),
  nextVenue: one(venues, {
    fields: [tourGaps.nextVenueId],
    references: [venues.id],
  }),
  suggestions: many(tourGapSuggestions),
}));

export const tourGapSuggestionsRelations = relations(tourGapSuggestions, ({ one }) => ({
  gap: one(tourGaps, {
    fields: [tourGapSuggestions.gapId],
    references: [tourGaps.id],
  }),
  venue: one(venues, {
    fields: [tourGapSuggestions.venueId],
    references: [venues.id],
  }),
}));

export const artistTourPreferencesRelations = relations(artistTourPreferences, ({ one }) => ({
  artist: one(artists, {
    fields: [artistTourPreferences.artistId],
    references: [artists.id],
  }),
}));

export const venueTourPreferencesRelations = relations(venueTourPreferences, ({ one }) => ({
  venue: one(venues, {
    fields: [venueTourPreferences.venueId],
    references: [venues.id],
  }),
}));

// Insert schemas for tour optimization
export const insertTourSchema = createInsertSchema(tours).omit({
  id: true,
  createdAt: true,
});

export const insertTourVenueSchema = createInsertSchema(tourVenues).omit({
  id: true,
  createdAt: true,
  statusUpdatedAt: true,
});

export const insertTourGapSchema = createInsertSchema(tourGaps).omit({
  id: true,
  createdAt: true,
});

export const insertTourGapSuggestionSchema = createInsertSchema(tourGapSuggestions).omit({
  id: true,
  createdAt: true,
});

export const insertArtistTourPreferencesSchema = createInsertSchema(artistTourPreferences).omit({
  id: true,
  createdAt: true,
});

export const insertVenueTourPreferencesSchema = createInsertSchema(venueTourPreferences).omit({
  id: true,
  createdAt: true,
});

// Types for tour optimization
export type Tour = typeof tours.$inferSelect;
export type InsertTour = z.infer<typeof insertTourSchema>;

export type TourVenue = typeof tourVenues.$inferSelect;
export type InsertTourVenue = z.infer<typeof insertTourVenueSchema>;

export type TourGap = typeof tourGaps.$inferSelect;
export type InsertTourGap = z.infer<typeof insertTourGapSchema>;

export type TourGapSuggestion = typeof tourGapSuggestions.$inferSelect;
export type InsertTourGapSuggestion = z.infer<typeof insertTourGapSuggestionSchema>;

export type ArtistTourPreferences = typeof artistTourPreferences.$inferSelect;
export type InsertArtistTourPreferences = z.infer<typeof insertArtistTourPreferencesSchema>;

export type VenueTourPreferences = typeof venueTourPreferences.$inferSelect;
export type InsertVenueTourPreferences = z.infer<typeof insertVenueTourPreferencesSchema>;

