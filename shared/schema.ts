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
  artistId: integer("artistId").references(() => artists.id),
  contactPhone: text("contactPhone"),
  profileImageUrl: text("profileImageUrl"),
  bio: text("bio"),
  lastLogin: timestamp("lastLogin"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Genres enum
export const genreEnum = pgEnum("genre", [
  "rock", "indie", "hip_hop", "electronic", "pop", "folk", "metal", "jazz", "blues", 
  "world", "classical", "country", "punk", "experimental", "alternative", "rnb", "soul",
  "reggae", "ambient", "techno", "house", "disco", "funk", "country", "other"
]);

// Market category enum
export const marketCategoryEnum = pgEnum("marketCategory", [
  "primary", "secondary", "tertiary"
]);

// Venue type enum
export const venueTypeEnum = pgEnum("venueType", [
  "club", "bar", "theater", "coffeehouse", "diy_space", "art_gallery", "college_venue", "community_center", "record_store"
]);

// Venue capacity category enum
export const capacityCategoryEnum = pgEnum("capacityCategory", [
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
  marketCategory: marketCategoryEnum("marketCategory"), // primary, secondary, tertiary

  // Venue details
  venueType: venueTypeEnum("venueType"), // club, bar, theater, etc.
  capacity: integer("capacity"),
  capacityCategory: capacityCategoryEnum("capacityCategory"), // tiny, small, medium, large

  // Genre specialization
  primaryGenre: genreEnum("primaryGenre"),
  secondaryGenres: genreEnum("secondaryGenres").array(),

  // Booking details for indie venues
  bookingContactName: text("bookingContactName"),
  bookingEmail: text("bookingEmail"), // Primary contact email for venue
  contactPhone: text("contactPhone"),
  typicalBookingLeadTime: integer("typicalBookingLeadTimeDays"), // How many days in advance they typically book
  paymentStructure: text("paymentStructure"), // guarantee, door split, etc.
  soundSystem: text("soundSystem"), // Description of sound system quality

  // Local support for touring artists
  localAccommodation: boolean("localAccommodation"), // Whether they offer crash spots
  localPromotion: boolean("localPromotion"), // Whether they help with promotion

  // Additional venue information
  description: text("description"),
  ageRestriction: text("ageRestriction"), // All-ages, 18+, 21+
  websiteUrl: text("websiteUrl"), // Primary website URL for the venue
  imageUrl: text("imageUrl"),
  socialMediaLinks: jsonb("socialMediaLinks"),

  // External IDs for future synchronization
  bandsintownId: text("bandsintownId").unique(),
  songkickId: text("songkickId").unique(),

  // Ownership and tracking
  ownerId: integer("ownerId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt"),
});

// Artists table
export const artists = pgTable("artists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  genres: genreEnum("genres").array(),
  popularity: integer("popularity"),
  spotifyId: text("spotifyId").unique(),
  bandsintownId: text("bandsintownId").unique(),
  songkickId: text("songkickId").unique(),
  imageUrl: text("imageUrl"),
  description: text("description"),
  websiteUrl: text("websiteUrl"),
  socialMediaLinks: jsonb("socialMediaLinks"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  artistId: integer("artistId").references(() => artists.id).notNull(),
  venueId: integer("venueId").references(() => venues.id).notNull(),
  date: date("date").notNull(),
  startTime: text("startTime"),
  ticketUrl: text("ticketUrl"),
  status: text("status").default("confirmed"),
  sourceId: text("sourceId"),
  sourceName: text("sourceName"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// VenueNetwork table
export const venueNetwork = pgTable("venue_network", {
  id: serial("id").primaryKey(),
  venueId: integer("venueId").references(() => venues.id).notNull(),
  connectedVenueId: integer("connectedVenueId").references(() => venues.id).notNull(),
  status: text("status").default("active"),
  trustScore: integer("trustScore").default(50),
  collaborativeBookings: integer("collaborativeBookings").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Predictions table
export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  artistId: integer("artistId").references(() => artists.id).notNull(),
  venueId: integer("venueId").references(() => venues.id).notNull(),
  suggestedDate: date("suggestedDate").notNull(),
  confidenceScore: integer("confidenceScore").notNull(),
  status: text("status").default("pending"),
  reasoning: text("reasoning"),
  gapBeforeEventId: integer("gapBeforeEventId").references(() => events.id),
  gapAfterEventId: integer("gapAfterEventId").references(() => events.id),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Inquiries table
export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  venueId: integer("venueId").references(() => venues.id).notNull(),
  artistId: integer("artistId").references(() => artists.id).notNull(),
  message: text("message").notNull(),
  proposedDate: date("proposedDate"),
  status: text("status").default("pending"),
  collaborators: integer("collaborators").array(),
  createdAt: timestamp("createdAt").defaultNow(),
});

// CollaborativeOpportunities table
export const collaborativeOpportunities = pgTable("collaborative_opportunities", {
  id: serial("id").primaryKey(),
  artistId: integer("artistId").references(() => artists.id).notNull(),
  creatorVenueId: integer("creatorVenueId").references(() => venues.id).notNull(),
  dateRangeStart: date("dateRangeStart").notNull(),
  dateRangeEnd: date("dateRangeEnd").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// CollaborativeParticipants table
export const collaborativeParticipants = pgTable("collaborative_participants", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunityId").references(() => collaborativeOpportunities.id).notNull(),
  venueId: integer("venueId").references(() => venues.id).notNull(),
  status: text("status").default("pending"),
  proposedDate: date("proposedDate"),
  createdAt: timestamp("createdAt").defaultNow(),
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
    fields: [predictions.gapBeforeEventId],
    references: [events.id],
  }),
  gapAfterEventRel: one(events, {
    fields: [predictions.gapAfterEventId],
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
  senderId: integer('senderId').references(() => users.id),
  receiverId: integer('receiverId').references(() => users.id),
  content: text('content').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  senderName: text('senderName').notNull(),
});

// Define webhook configurations table
export const webhookConfigurations = pgTable('webhook_configurations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // e.g., 'bandsintown_events', 'artist_updates', etc.
  description: text('description'),
  callbackUrl: text('callbackUrl').notNull(),
  isEnabled: boolean('isEnabled').default(false),
  secretKey: text('secretKey'),
  configOptions: text('configOptions'),
  lastExecuted: timestamp('lastExecuted'),
  createdAt: timestamp('createdAt').defaultNow()
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

// Add schema and type for webhook configurations
export const insertWebhookConfigurationSchema = createInsertSchema(webhookConfigurations).omit({
  id: true,
  createdAt: true,
});

export type WebhookConfiguration = typeof webhookConfigurations.$inferSelect;
export type InsertWebhookConfiguration = z.infer<typeof insertWebhookConfigurationSchema>;

// Tour Routes table for optimization paths
export const tourRoutes = pgTable("tour_routes", {
  id: serial("id").primaryKey(),
  tourId: integer("tourId").references(() => tours.id).notNull(),
  startVenueId: integer("startVenueId").references(() => venues.id),
  endVenueId: integer("endVenueId").references(() => venues.id),
  distanceKm: real("distanceKm"),
  estimatedTravelTimeMinutes: integer("estimatedTravelTimeMinutes"),
  optimizationScore: integer("optimizationScore"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Tour optimization tables
export const tours = pgTable("tours", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  artistId: integer("artistId").references(() => artists.id).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  status: text("status").default("planning"), // planning, booking, confirmed, completed, cancelled
  description: text("description"),
  totalBudget: real("totalBudget"),
  estimatedTravelDistance: real("estimatedTravelDistance"),
  estimatedTravelTime: integer("estimatedTravelTimeMinutes"),
  // Initial score metrics (before optimization)
  initialOptimizationScore: integer("initialOptimizationScore"),
  initialTotalDistance: real("initialTotalDistance"),
  initialTravelTime: integer("initialTravelTimeMinutes"),
  // Final optimization score (after optimization)
  optimizationScore: integer("optimizationScore"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt"),
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
  tourId: integer("tourId").references(() => tours.id).notNull(),
  venueId: integer("venueId").references(() => venues.id).notNull(),
  date: date("date"),
  // Using text instead of the enum for now to maintain compatibility with existing data
  // Can be migrated to use the enum in a future update
  status: text("status").default("potential"), // See tourVenueStatusEnum for valid values
  sequence: integer("sequence"), // Order in the tour
  travelDistanceFromPrevious: real("travelDistanceFromPrevious"),
  travelTimeFromPrevious: integer("travelTimeFromPrevious"), // in minutes
  notes: text("notes"),
  statusUpdatedAt: timestamp("statusUpdatedAt"), // Track when status changes
  createdAt: timestamp("createdAt").defaultNow(),
});

export const tourGaps = pgTable("tour_gaps", {
  id: serial("id").primaryKey(),
  tourId: integer("tourId").references(() => tours.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  previousVenueId: integer("previousVenueId").references(() => venues.id),
  nextVenueId: integer("nextVenueId").references(() => venues.id),
  locationLatitude: real("location_latitude"),
  locationLongitude: real("location_longitude"),
  maxTravelDistance: real("max_travel_distance"),
  status: text("status").default("open"), // open, filled, skipped
  createdAt: timestamp("createdAt").defaultNow(),
});

export const tourGapSuggestions = pgTable("tour_gap_suggestions", {
  id: serial("id").primaryKey(),
  gapId: integer("gapId").references(() => tourGaps.id).notNull(),
  venueId: integer("venueId").references(() => venues.id).notNull(),
  suggestedDate: date("suggested_date").notNull(),
  matchScore: integer("match_score").default(50),
  travelDistanceFromPrevious: real("travel_distance_from_previous"),
  travelDistanceToNext: real("travel_distance_to_next"),
  status: text("status").default("suggested"), // suggested, accepted, rejected
  createdAt: timestamp("createdAt").defaultNow(),
});

export const artistTourPreferences = pgTable("artist_tour_preferences", {
  id: serial("id").primaryKey(),
  artistId: integer("artistId").references(() => artists.id).notNull(),
  preferredRegions: text("preferred_regions").array(),
  preferredVenueTypes: text("preferred_venue_types").array(),
  preferredVenueCapacity: jsonb("preferred_venue_capacity"), // { min, max }
  maxTravelDistancePerDay: real("max_travel_distance_per_day"),
  minDaysBetweenShows: integer("min_days_between_shows").default(0),
  maxDaysBetweenShows: integer("max_days_between_shows"),
  avoidDates: jsonb("avoid_dates").array(),
  requiredDayOff: text("required_day_off").array(), // e.g., ["Sunday", "Monday"]
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt"),
});

export const venueTourPreferences = pgTable("venue_tour_preferences", {
  id: serial("id").primaryKey(),
  venueId: integer("venueId").references(() => venues.id).notNull(),
  preferredGenres: genreEnum("preferred_genres").array(),
  availableDates: jsonb("available_dates").array(),
  minimumArtistPopularity: integer("minimum_artist_popularity"),
  preferredNoticeTime: integer("preferred_notice_time_days"),
  openToCollaboration: boolean("open_to_collaboration").default(true),
  participationRadius: real("participation_radius"), // max distance in km for tour collaboration
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt"),
});

// Relations for tour optimization
export const toursRelations = relations(tours, ({ one, many }) => ({
  artist: one(artists, {
    fields: [tours.artistId],
    references: [artists.id],
  }),
  venues: many(tourVenues),
  gaps: many(tourGaps),
  routes: many(tourRoutes),
}));

export const tourRoutesRelations = relations(tourRoutes, ({ one }) => ({
  tour: one(tours, {
    fields: [tourRoutes.tourId],
    references: [tours.id],
  }),
  startVenue: one(venues, {
    fields: [tourRoutes.startVenueId],
    references: [venues.id],
  }),
  endVenue: one(venues, {
    fields: [tourRoutes.endVenueId],
    references: [venues.id],
  }),
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

export const insertTourRouteSchema = createInsertSchema(tourRoutes).omit({
  id: true,
  createdAt: true,
});

// Types for tour optimization
export type Tour = typeof tours.$inferSelect;
export type InsertTour = z.infer<typeof insertTourSchema>;

export type TourRoute = typeof tourRoutes.$inferSelect;
export type InsertTourRoute = z.infer<typeof insertTourRouteSchema>;

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