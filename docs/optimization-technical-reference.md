# Tour Optimization Technical Reference

This document provides technical information about the tour optimization features in our venue discovery and tour management platform.

## Core Concepts

### Optimization Goals

The tour optimization system aims to:

1. **Minimize travel distance** between venues
2. **Optimize scheduling** to reduce downtime
3. **Suggest potential venues** for gaps in the tour
4. **Balance geographical coverage** with efficient routing

### Data Structures

#### Tour Points

Tour points represent fixed locations in a tour:

```typescript
interface RoutingPoint {
  id: number;
  latitude: number | null;
  longitude: number | null;
  date: Date | null;
  isFixed: boolean;
  status: string;
}
```

#### Optimization Results

The optimization process produces results in this format:

```typescript
interface OptimizedRoute {
  tourVenues: Array<{
    venue: Venue;
    sequence: number;
    suggestedDate?: string;
    isFixed: boolean;
    gapFilling?: boolean;
    detourRatio?: number;
  }>;
  gaps: Array<{
    startDate: Date;
    endDate: Date;
    previousVenueId: number;
    nextVenueId: number;
  }>;
  totalDistance: number;
  totalTravelTime: number;
  optimizationScore: number;
}
```

## Optimization Algorithms

### Distance Calculation

The standard distance calculation uses the Haversine formula:

```typescript
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}
```

### Travel Time Estimation

Travel time is estimated based on distance:

```typescript
function estimateTravelTime(distanceKm: number): number {
  // Assuming average speed of 70 km/h for touring
  const averageSpeedKmh = 70;
  // Convert to minutes and add buffer for rest stops, traffic, etc.
  const travelTimeMinutes = (distanceKm / averageSpeedKmh) * 60;
  const bufferFactor = 1.2; // 20% buffer
  
  return Math.round(travelTimeMinutes * bufferFactor);
}
```

### Optimization Score Calculation

The optimization score considers multiple factors:

```typescript
function calculateOptimizationScore(
  totalDistance: number, 
  totalTravelTime: number,
  gapFillingQuality: number, 
  geographicClustering: number
): number {
  const baseScore = 100;
  const distancePenalty = Math.min(20, totalDistance / 100);
  const timePenalty = Math.min(20, totalTravelTime / 500);
  const gapFillingBonus = Math.min(15, gapFillingQuality);
  const clusterBonus = Math.min(10, geographicClustering);
  
  return Math.max(0, baseScore - distancePenalty - timePenalty + gapFillingBonus + clusterBonus);
}
```

## API Endpoints

### Standard Optimization

- **Endpoint**: `POST /api/tours/:id/optimize`
- **Purpose**: Generate an optimized route for a tour
- **Returns**: `OptimizedRoute` object with suggested venue sequence

### AI-Powered Optimization

- **Endpoint**: `POST /api/ai-tour-optimizer/:id/suggestions`
- **Purpose**: Get AI-generated optimization suggestions
- **Returns**: AI suggestions, reasoning, and optimized metrics

### Apply Optimization

- **Endpoint**: `POST /api/tours/:id/apply-optimization`
- **Purpose**: Apply optimization results to a tour
- **Action**: Updates tour venue sequences and optimization metrics

## Frontend Integration

The optimization features integrate with the frontend through:

1. **Optimization Dialog** - UI component for triggering optimization
2. **Results Display** - Shows optimization metrics and suggestions
3. **Route Map** - Visualizes the optimized route
4. **AI Reasoning** - Explains the AI's optimization decisions

## Best Practices

1. Always validate venue coordinates before optimization
2. Preserve confirmed venue dates and sequences
3. Calculate and display "before/after" metrics for transparency
4. Provide clear explanations of optimization benefits to users