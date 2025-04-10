# Feature Implementation Instructions

This document provides detailed technical guidelines for implementing each feature in the Venue Discovery Platform enhancement plan. It serves as a reference for developers working on specific features.

## 1. Tour Optimization Engine

### Database Schema Updates
```typescript
// Add to shared/schema.ts
export const tourRoutes = pgTable("tour_routes", {
  id: serial("id").primaryKey(),
  tourId: text("tour_id").notNull(),
  startVenueId: integer("start_venue_id").references(() => venues.id),
  endVenueId: integer("end_venue_id").references(() => venues.id),
  distanceKm: real("distance_km"),
  estimatedTravelTimeMinutes: integer("estimated_travel_time_minutes"),
  optimizationScore: integer("optimization_score"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tourGaps = pgTable("tour_gaps", {
  id: serial("id").primaryKey(),
  tourId: text("tour_id").notNull(),
  gapStartDate: date("gap_start_date").notNull(),
  gapEndDate: date("gap_end_date").notNull(),
  previousVenueId: integer("previous_venue_id").references(() => venues.id),
  nextVenueId: integer("next_venue_id").references(() => venues.id),
  potentialVenueIds: integer("potential_venue_ids").array(),
  status: text("status").default("open"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Routing Algorithm Implementation
```typescript
// In a new file: shared/utils/routing-optimizer.ts
export function optimizeTourRoute(
  venues: Venue[],
  existingBookings: Event[]
): OptimizedRoute {
  // 1. Sort venues by geographical proximity
  // 2. Calculate optimal sequence to minimize travel distance
  // 3. Identify potential gaps in the schedule
  // 4. Return optimized route with gaps identified
  
  // Implementation details would use algorithms like:
  // - Nearest neighbor for initial pathfinding
  // - 2-opt or 3-opt for route refinement
  // - Time-window constraints for scheduling
}
```

### API Endpoints
```typescript
// Add to server/routes.ts
router.post("/api/tours/:tourId/optimize", async (req, res) => {
  const { tourId } = req.params;
  const { constraints } = req.body;
  
  try {
    // 1. Fetch tour details
    // 2. Get all venues and existing bookings
    // 3. Run optimization algorithm
    // 4. Save results to database
    // 5. Return optimized route
    
    res.json({ /* optimized route data */ });
  } catch (error) {
    res.status(500).json({ error: "Failed to optimize tour route" });
  }
});
```

### Frontend Components
```tsx
// New component: client/src/components/tour/route-optimizer.tsx
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { optimizeTourRoute } from '@/lib/api';
import { Map } from 'mapbox-gl';
// Additional imports...

export function RouteOptimizer({ tourId }: { tourId: string }) {
  // Implementation of the route optimization UI
  // - Map visualization
  // - Optimization controls
  // - Results display
}
```

## 2. Artist Matching System

### Database Schema Updates
```typescript
// Add to shared/schema.ts
export const venueGenrePerformance = pgTable("venue_genre_performance", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").references(() => venues.id).notNull(),
  genre: genreEnum("genre").notNull(),
  performanceScore: integer("performance_score").default(50),
  bookingCount: integer("booking_count").default(0),
  audienceRating: integer("audience_rating"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const artistVenueMatches = pgTable("artist_venue_matches", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id").references(() => artists.id).notNull(),
  venueId: integer("venue_id").references(() => venues.id).notNull(),
  matchScore: integer("match_score").notNull(),
  genreCompatibility: integer("genre_compatibility"),
  audienceCompatibility: integer("audience_compatibility"),
  geographicScore: integer("geographic_score"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Matching Algorithm
```typescript
// In a new file: server/utils/artist-matcher.ts
export async function calculateArtistVenueMatch(
  artistId: number,
  venueId: number
): Promise<MatchScore> {
  // 1. Get artist and venue details
  // 2. Calculate genre compatibility
  // 3. Calculate audience demographic match
  // 4. Consider geographical relevance
  // 5. Factor in historical performance
  // 6. Return composite match score
}
```

### API Endpoints
```typescript
// Add to server/routes.ts
router.get("/api/venues/:venueId/artist-matches", async (req, res) => {
  const { venueId } = req.params;
  
  try {
    // 1. Get venue details
    // 2. Find all potential artist matches
    // 3. Calculate match scores
    // 4. Return sorted results
    
    res.json({ /* artist matches data */ });
  } catch (error) {
    res.status(500).json({ error: "Failed to find artist matches" });
  }
});
```

## 3. Enhanced Venue Network

### Trust Score System
```typescript
// Add to shared/schema.ts
export const venueVerifications = pgTable("venue_verifications", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").references(() => venues.id).notNull(),
  verificationType: text("verification_type").notNull(),  // "document", "business", "payment", etc.
  verificationStatus: text("verification_status").default("pending"),
  documentUrl: text("document_url"),
  verifiedBy: integer("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Network Visualization Enhancements
```tsx
// Enhance: client/src/components/venue-network/network-visualization.tsx
type NetworkVisualizationProps = {
  data: any;
  onNodeClick: (node: any) => void;
  onAddVenue: () => void;
  filters?: {
    genreFilter?: string;
    capacityRange?: [number, number];
    regionFilter?: string;
    trustScoreMin?: number;
  };
};

export function NetworkVisualization({
  data,
  onNodeClick,
  onAddVenue,
  filters = {}
}: NetworkVisualizationProps) {
  // Implementation with enhanced filtering
  // - Filter nodes based on criteria
  // - Update visualization accordingly
  // - Add legend for filtered view
}
```

## 4. Predictive Analytics Dashboard

### Database Schema for Analytics
```typescript
// Add to shared/schema.ts
export const venueAnalytics = pgTable("venue_analytics", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").references(() => venues.id).notNull(),
  date: date("date").notNull(),
  revenue: real("revenue"),
  attendance: integer("attendance"),
  capacityUtilization: real("capacity_utilization"),
  eventCount: integer("event_count"),
  averageTicketPrice: real("average_ticket_price"),
  dominantGenre: genreEnum("dominant_genre"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const venueForecast = pgTable("venue_forecast", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").references(() => venues.id).notNull(),
  forecastDate: date("forecast_date").notNull(),
  predictedRevenue: real("predicted_revenue"),
  predictedAttendance: integer("predicted_attendance"),
  confidenceScore: integer("confidence_score"),
  influencingFactors: jsonb("influencing_factors"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Analytics Implementation
```typescript
// In a new file: server/utils/analytics-engine.ts
export async function generateVenueForecast(
  venueId: number,
  startDate: Date,
  endDate: Date
): Promise<VenueForecast[]> {
  // 1. Gather historical data
  // 2. Identify seasonal patterns
  // 3. Apply forecasting algorithm (ARIMA, Prophet, or similar)
  // 4. Generate confidence intervals
  // 5. Return forecast data
}
```

### Frontend Components
```tsx
// New component: client/src/components/analytics/revenue-forecast.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVenueForecast } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function RevenueForecast({ venueId, range = 90 }: { venueId: number, range?: number }) {
  // Implementation of revenue forecast visualization
}
```

## 5. Advanced Booking Management

### Contract Template System
```typescript
// Add to shared/schema.ts
export const contractTemplates = pgTable("contract_templates", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").references(() => venues.id).notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  variables: jsonb("variables"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  templateId: integer("template_id").references(() => contractTemplates.id),
  content: text("content").notNull(),
  status: text("status").default("draft"),
  signedByVenue: boolean("signed_by_venue").default(false),
  signedByArtist: boolean("signed_by_artist").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});
```

### Rider Management
```typescript
// Add to shared/schema.ts
export const riderItems = pgTable("rider_items", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id").references(() => artists.id).notNull(),
  category: text("category").notNull(), // "technical", "hospitality", "transportation", etc.
  item: text("item").notNull(),
  description: text("description"),
  isRequired: boolean("is_required").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventRiderStatus = pgTable("event_rider_status", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  riderItemId: integer("rider_item_id").references(() => riderItems.id).notNull(),
  status: text("status").default("pending"), // "pending", "confirmed", "declined", "alternative"
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

## 6. Mobile Experience Enhancement

### Push Notification System
```typescript
// Add to shared/schema.ts
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  newOpportunities: boolean("new_opportunities").default(true),
  bookingRequests: boolean("booking_requests").default(true),
  contractUpdates: boolean("contract_updates").default(true),
  networkActivity: boolean("network_activity").default(true),
  marketingMessages: boolean("marketing_messages").default(false),
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedEntityType: text("related_entity_type"), // "event", "artist", "venue", etc.
  relatedEntityId: integer("related_entity_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Frontend Components
```tsx
// New component: client/src/components/notifications/notification-center.tsx
import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getNotifications, markNotificationAsRead } from '@/lib/api';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

export function NotificationCenter() {
  // Implementation of notification center UI
}
```

## 7. Collaborative Booking Tools

### Multi-venue Booking Proposal
```typescript
// Add to shared/schema.ts
export const collaborativeProposals = pgTable("collaborative_proposals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  artistId: integer("artist_id").references(() => artists.id).notNull(),
  initiatorVenueId: integer("initiator_venue_id").references(() => venues.id).notNull(),
  dateRange: jsonb("date_range").notNull(), // { startDate, endDate }
  status: text("status").default("draft"),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const collaborativeProposalVenues = pgTable("collaborative_proposal_venues", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposal_id").references(() => collaborativeProposals.id).notNull(),
  venueId: integer("venue_id").references(() => venues.id).notNull(),
  preferredDate: date("preferred_date"),
  status: text("status").default("invited"), // "invited", "accepted", "declined"
  response: text("response"),
  responseDate: timestamp("response_date"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Shared Calendar System
```typescript
// New API endpoints in server/routes.ts
router.get("/api/venues/network/:venueId/calendar", async (req, res) => {
  const { venueId } = req.params;
  const { startDate, endDate } = req.query;
  
  try {
    // 1. Get venue's network
    // 2. Fetch calendar data for all venues in network
    // 3. Return consolidated calendar
    
    res.json({ /* calendar data */ });
  } catch (error) {
    res.status(500).json({ error: "Failed to get network calendar" });
  }
});
```

## 8. Security & Verification Enhancements

### Identity Verification
```typescript
// Add to shared/schema.ts
export const identityVerifications = pgTable("identity_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  verificationType: text("verification_type").notNull(), // "email", "phone", "document", "business"
  status: text("status").default("pending"),
  verificationData: text("verification_data"),
  verifiedAt: timestamp("verified_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Secure Payment Escrow
```typescript
// Add to shared/schema.ts
export const paymentEscrows = pgTable("payment_escrows", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").default("USD"),
  payerId: integer("payer_id").references(() => users.id).notNull(),
  payeeId: integer("payee_id").references(() => users.id).notNull(),
  status: text("status").default("pending"), // "pending", "held", "released", "refunded", "disputed"
  releaseConditions: jsonb("release_conditions"),
  transactionId: text("transaction_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});
```

## 9. Marketing & Promotion Toolset

### Social Media Integration
```typescript
// Add to shared/schema.ts
export const socialMediaAccounts = pgTable("social_media_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  platform: text("platform").notNull(), // "facebook", "twitter", "instagram", etc.
  accountId: text("account_id").notNull(),
  accountName: text("account_name"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  isConnected: boolean("is_connected").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const scheduledPosts = pgTable("scheduled_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  socialAccountId: integer("social_account_id").references(() => socialMediaAccounts.id).notNull(),
  content: text("content").notNull(),
  mediaUrls: text("media_urls").array(),
  scheduledTime: timestamp("scheduled_time").notNull(),
  status: text("status").default("scheduled"), // "scheduled", "posted", "failed"
  relatedEntityType: text("related_entity_type"), // "event", "artist", etc.
  relatedEntityId: integer("related_entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});
```

## 10. Artist/Agent Portal

### Artist Interface
```typescript
// Add to shared/schema.ts
export const artistAccounts = pgTable("artist_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  artistId: integer("artist_id").references(() => artists.id).notNull(),
  role: text("role").default("manager"), // "performer", "manager", "agent"
  isVerified: boolean("is_verified").default(false),
  verificationMethod: text("verification_method"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const artistTourPreferences = pgTable("artist_tour_preferences", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id").references(() => artists.id).notNull(),
  preferredRegions: text("preferred_regions").array(),
  preferredVenueTypes: text("preferred_venue_types").array(),
  preferredVenueSize: jsonb("preferred_venue_size"), // { min, max }
  avoidDates: jsonb("avoid_dates").array(),
  minimumGap: integer("minimum_gap_days"),
  maximumTravelDistance: integer("maximum_travel_distance"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});
```

## 11. Community & Networking Features

### Industry Forum
```typescript
// Add to shared/schema.ts
export const forumCategories = pgTable("forum_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull(),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const forumTopics = pgTable("forum_topics", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => forumCategories.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").default(false),
  isLocked: boolean("is_locked").default(false),
  viewCount: integer("view_count").default(0),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const forumPosts = pgTable("forum_posts", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").references(() => forumTopics.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

## 12. Data Integration & APIs

### External Calendar Sync
```typescript
// Add to shared/schema.ts
export const externalCalendars = pgTable("external_calendars", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  calendarType: text("calendar_type").notNull(), // "google", "ical", "outlook", etc.
  calendarId: text("calendar_id").notNull(),
  name: text("name").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  syncEnabled: boolean("sync_enabled").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const calendarSyncEvents = pgTable("calendar_sync_events", {
  id: serial("id").primaryKey(),
  calendarId: integer("calendar_id").references(() => externalCalendars.id).notNull(),
  eventId: integer("event_id").references(() => events.id),
  externalEventId: text("external_event_id").notNull(),
  lastSyncStatus: text("last_sync_status").default("success"),
  lastSyncAt: timestamp("last_sync_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## Development Workflow Guidelines

### Code Structure
- Keep database models in `shared/schema.ts`
- Place backend business logic in `server/services/`
- Put reusable utility functions in `shared/utils/`
- Create frontend components in appropriate subdirectories of `client/src/components/`

### Testing Approach
- Write unit tests for all algorithm implementations
- Create integration tests for API endpoints
- Develop end-to-end tests for critical user flows
- Use mock data for testing that closely resembles production data

### Performance Considerations
- Implement pagination for all list endpoints
- Use query optimization for complex database operations
- Implement caching for frequently accessed data
- Profile and optimize render performance of components

### Security Best Practices
- Sanitize all user inputs
- Implement proper authentication and authorization checks
- Use environment variables for sensitive configuration
- Apply rate limiting for API endpoints
- Implement CSRF protection for forms
- Use secure HTTP headers
- Validate all data from external sources