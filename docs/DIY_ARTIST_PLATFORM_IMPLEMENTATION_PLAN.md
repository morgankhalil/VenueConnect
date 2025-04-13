# VenueConnect DIY Artist Platform: Development Planning Document

## Overview
Before building any new features, this document outlines a comprehensive plan for enhancing the platform with DIY artist tools while maximizing our existing codebase. The plan focuses on technical requirements, database schema updates, UI/UX considerations, and implementation strategy.

## Current Strengths We'll Build Upon

### 1. Tour Planning & Optimization
- Existing tour management components (tour-detail, tour-form)
- Route optimization algorithms
- Map visualizations
- Tour venue status tracking

### 2. Venue Database & Discovery
- Venue profiles with technical specifications
- Geographic visualization
- Venue networking functionality
- Booking relationship tracking

### 3. Calendar & Scheduling
- Event scheduling system
- Full calendar implementation
- Event management capabilities

## Technical Implementation Plan

### Phase 1: Database Schema Updates

#### 1. Artist Self-Management
```typescript
// Band Member Management
export const bandMembers = pgTable("bandMembers", {
  id: serial("id").primaryKey(),
  artistId: integer("artistId").references(() => artists.id).notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // e.g. guitarist, vocalist, drummer
  email: text("email"),
  phone: text("phone"),
  isActive: boolean("isActive").default(true),
  joinDate: date("joinDate"),
  leaveDate: date("leaveDate"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Task Management
export const artistTasks = pgTable("artistTasks", {
  id: serial("id").primaryKey(),
  artistId: integer("artistId").references(() => artists.id).notNull(),
  assignedUserId: integer("assignedUserId").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: date("dueDate"),
  priority: text("priority").default("medium"), // high, medium, low
  status: text("status").default("pending"), // pending, in_progress, completed, cancelled
  category: text("category").notNull(), // booking, promotion, logistics, merch, etc.
  tourId: integer("tourId").references(() => tours.id), // Optional relation to a specific tour
  createdAt: timestamp("createdAt").defaultNow(),
  completedAt: timestamp("completedAt"),
});

// Goals & Milestones
export const artistGoals = pgTable("artistGoals", {
  id: serial("id").primaryKey(), 
  artistId: integer("artistId").references(() => artists.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: date("targetDate"),
  status: text("status").default("in_progress"), // in_progress, achieved, missed, cancelled
  category: text("category").notNull(), // audience_growth, revenue, streaming, touring, etc.
  measurable: boolean("measurable").default(false),
  targetValue: integer("targetValue"),
  currentValue: integer("currentValue").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  achievedAt: timestamp("achievedAt"),
});
```

#### 2. Financial Management
```typescript
// Show Finance Tracking
export const showFinances = pgTable("showFinances", {
  id: serial("id").primaryKey(),
  tourVenueId: integer("tourVenueId").references(() => tourVenues.id).notNull(),
  guaranteeAmount: real("guaranteeAmount"),
  doorSplitPercentage: real("doorSplitPercentage"),
  merch: jsonb("merch"), // { totalSales, venuePercentage, netIncome }
  ticketsSold: integer("ticketsSold"),
  ticketPrice: real("ticketPrice"),
  expenseTotal: real("expenseTotal"),
  revenueTotal: real("revenueTotal"),
  netProfit: real("netProfit"),
  settlementComplete: boolean("settlementComplete").default(false),
  settlementNotes: text("settlementNotes"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt"),
});

// Tour Expenses
export const tourExpenses = pgTable("tourExpenses", {
  id: serial("id").primaryKey(),
  tourId: integer("tourId").references(() => tours.id).notNull(),
  tourVenueId: integer("tourVenueId").references(() => tourVenues.id), // Optional, for venue-specific expenses
  category: text("category").notNull(), // transportation, accommodation, food, gear, promotion, etc.
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  date: date("date").notNull(),
  paidBy: integer("paidBy").references(() => users.id), // Who paid for it
  reimbursed: boolean("reimbursed").default(false),
  receiptUrl: text("receiptUrl"),
  createdAt: timestamp("createdAt").defaultNow(),
});
```

#### 3. Media & Assets Management
```typescript
// Media Assets
export const mediaAssets = pgTable("mediaAssets", {
  id: serial("id").primaryKey(),
  artistId: integer("artistId").references(() => artists.id).notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(), // photo, video, audio, document, stage_plot, tech_rider
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  description: text("description"),
  isPublic: boolean("isPublic").default(true),
  category: text("category"), // press, promotional, technical, live, etc.
  tags: text("tags").array(),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Press Kit Items
export const pressKitItems = pgTable("pressKitItems", {
  id: serial("id").primaryKey(),
  artistId: integer("artistId").references(() => artists.id).notNull(),
  type: text("type").notNull(), // bio, quote, photo, video, achievement
  title: text("title").notNull(),
  content: text("content"),
  mediaAssetId: integer("mediaAssetId").references(() => mediaAssets.id),
  sortOrder: integer("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});
```

### Phase 2: API Endpoints

#### Artist Management
```
GET /api/artists/:id/dashboard - Artist dashboard overview
GET /api/artists/:id/members - List band members
POST /api/artists/:id/members - Add band member
PUT /api/artists/:id/members/:memberId - Update band member

GET /api/artists/:id/tasks - List tasks
POST /api/artists/:id/tasks - Create task
PUT /api/artists/:id/tasks/:taskId - Update task
DELETE /api/artists/:id/tasks/:taskId - Delete task

GET /api/artists/:id/goals - List goals
POST /api/artists/:id/goals - Create goal
PUT /api/artists/:id/goals/:goalId - Update goal
```

#### Financial Management
```
GET /api/tours/:id/finances - Get financial overview for tour
POST /api/tours/:id/expenses - Add expense
GET /api/tours/:id/expenses - List expenses
PUT /api/tours/:id/expenses/:expenseId - Update expense

GET /api/tour-venues/:id/settlement - Get venue settlement details
POST /api/tour-venues/:id/settlement - Create/update settlement
```

#### Media Assets
```
GET /api/artists/:id/media - List media assets
POST /api/artists/:id/media - Upload media asset
DELETE /api/artists/:id/media/:mediaId - Delete media asset

GET /api/artists/:id/press-kit - Get press kit
POST /api/artists/:id/press-kit/items - Add press kit item
PUT /api/artists/:id/press-kit/items/:itemId - Update press kit item
```

### Phase 3: UI Components

#### 1. Artist Dashboard
- **Components:**
  - BandDashboard.tsx - Main dashboard view with key metrics
  - BandMemberManagement.tsx - Band member management interface
  - TaskManager.tsx - Task tracking component
  - GoalTracker.tsx - Goal setting and tracking component

- **Screens:**
  - /artist-dashboard - Main dashboard
  - /artist-dashboard/members - Member management
  - /artist-dashboard/tasks - Task management
  - /artist-dashboard/goals - Goal tracking

#### 2. Financial Management
- **Components:**
  - TourFinanceDashboard.tsx - Financial overview for a tour
  - ExpenseTracker.tsx - Expense entry and categorization
  - ShowSettlement.tsx - Show settlement recording
  - FinancialMetrics.tsx - Financial performance visualization

- **Screens:**
  - /tours/:id/finances - Tour financial dashboard
  - /tours/:id/expenses - Expense tracking
  - /tour-venues/:id/settlement - Show settlement

#### 3. Media Asset Management
- **Components:**
  - MediaLibrary.tsx - Media asset organization
  - PressKitBuilder.tsx - Press kit construction interface
  - AssetUploader.tsx - File upload component
  - MediaGallery.tsx - Visual gallery of assets

- **Screens:**
  - /artist-media - Media library
  - /artist-media/press-kit - Press kit manager

## Implementation Priorities

### Phase 1: Core Artist Self-Management (2-3 weeks)
1. Database schema updates
2. Band member management
3. Task tracking system
4. Basic financial tracking (expenses)

### Phase 2: Financial & Show Management (2-3 weeks)
1. Show settlement recording
2. Tour expense categorization
3. Financial dashboard with visualizations
4. Budget vs. actual tracking

### Phase 3: Media & Press Kit Management (2-3 weeks)
1. Media asset library
2. Press kit builder
3. Document organization (riders, stage plots)
4. Integration with booking process

## Technical Considerations

### State Management
- Use React Query for data fetching and cache management
- Create custom hooks for artist-related data operations

### Database Considerations
- Optimize queries for dashboard performance
- Implement proper indexing for financial calculations
- Set up efficient media asset storage

### UI/UX Design Principles
- Create consistent components that match existing design
- Focus on mobile-friendly interfaces for on-the-road use
- Provide clear visualizations for financial data
- Implement drag-and-drop for task prioritization and media management

## Integration with Existing Features

1. **Tour Management**
   - Connect financial tracking directly to tour venues
   - Integrate task management with tour planning milestones
   - Link media assets to venues for tech requirements

2. **Venue Database**
   - Associate settlement records with specific venues
   - Track financial history by venue for better forecasting
   - Link venue technical specs to artist requirements

3. **Calendar**
   - Integrate task due dates with calendar
   - Show financial events (payment due dates) on calendar
   - Display rehearsals and non-public events

## Next Steps

1. **Review and Refine Plan**
   - Gather feedback on schema design
   - Prioritize specific features

2. **Begin Implementation**
   - Update database schema
   - Implement core API endpoints
   - Create initial UI components for artist dashboard

3. **Testing Strategy**
   - Develop test data for financial tracking
   - Create user stories for validation