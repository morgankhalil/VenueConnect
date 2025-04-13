-- Table: venues
CREATE TABLE IF NOT EXISTS "venues" (
  "id" integer DEFAULT nextval('venues_id_seq'::regclass) NOT NULL,
  "name" text NOT NULL,
  "city" text NOT NULL,
  "country" text DEFAULT 'US'::text,
  "capacity" integer,
  "latitude" real,
  "longitude" real,
  "contactPhone" text,
  "description" text,
  "imageUrl" text,
  "ownerId" integer,
  "createdAt" timestamp without time zone DEFAULT now(),
  "bandsintownId" text,
  "region" text,
  "marketCategory" USER-DEFINED,
  "venueType" USER-DEFINED,
  "capacityCategory" USER-DEFINED,
  "primaryGenre" USER-DEFINED,
  "secondaryGenres" ARRAY,
  "bookingContactName" text,
  "bookingEmail" text,
  "typicalBookingLeadTimeDays" integer,
  "paymentStructure" text,
  "soundSystem" text,
  "localAccommodation" boolean,
  "localPromotion" boolean,
  "ageRestriction" text,
  "websiteUrl" text,
  "socialMediaLinks" jsonb,
  "songkickId" text,
  "updatedAt" timestamp without time zone,
  "googlePlaceId" text,
  PRIMARY KEY ("id")
);

-- Table: events
CREATE TABLE IF NOT EXISTS "events" (
  "id" integer DEFAULT nextval('events_id_seq'::regclass) NOT NULL,
  "artistId" integer NOT NULL,
  "venueId" integer NOT NULL,
  "date" date NOT NULL,
  "startTime" text,
  "ticketUrl" text,
  "status" text DEFAULT 'confirmed'::text,
  "sourceId" text,
  "sourceName" text,
  "createdAt" timestamp without time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: tours
CREATE TABLE IF NOT EXISTS "tours" (
  "id" integer DEFAULT nextval('tours_id_seq'::regclass) NOT NULL,
  "name" text NOT NULL,
  "artistId" integer NOT NULL,
  "startDate" date NOT NULL,
  "endDate" date NOT NULL,
  "status" text DEFAULT 'planning'::text,
  "description" text,
  "totalBudget" real,
  "estimatedTravelDistance" real,
  "estimatedTravelTimeMinutes" integer,
  "optimizationScore" integer,
  "createdAt" timestamp without time zone DEFAULT now(),
  "updatedAt" timestamp without time zone,
  "initialOptimizationScore" integer,
  "initialTotalDistance" real,
  "initialTravelTimeMinutes" integer,
  PRIMARY KEY ("id")
);

-- Table: tourVenues
CREATE TABLE IF NOT EXISTS "tourVenues" (
  "id" integer DEFAULT nextval('tour_venues_id_seq'::regclass) NOT NULL,
  "tourId" integer NOT NULL,
  "venueId" integer NOT NULL,
  "date" date,
  "status" text DEFAULT 'proposed'::text,
  "sequence" integer,
  "travelDistanceFromPrevious" real,
  "travelTimeFromPrevious" integer,
  "notes" text,
  "createdAt" timestamp without time zone DEFAULT now(),
  "statusUpdatedAt" timestamp with time zone,
  PRIMARY KEY ("id")
);

-- Table: artists
CREATE TABLE IF NOT EXISTS "artists" (
  "id" integer DEFAULT nextval('artists_id_seq'::regclass) NOT NULL,
  "name" text NOT NULL,
  "genres" ARRAY,
  "popularity" integer,
  "spotifyId" text,
  "bandsintownId" text,
  "songkickId" text,
  "imageUrl" text,
  "description" text,
  "websiteUrl" text,
  "socialMediaLinks" jsonb,
  "createdAt" timestamp without time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: genres
CREATE TABLE IF NOT EXISTS "genres" (
  "id" integer DEFAULT nextval('genres_id_seq'::regclass) NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "parentId" integer,
  "createdAt" timestamp without time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

