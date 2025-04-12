import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { TourDetailTabs } from '@/components/tour/tour-detail-tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Download, Edit, Share } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

// Define type for a venue
interface Venue {
  id: number;
  tourVenue: {
    id: number;
    tourId: number;
    venueId: number;
    date: string | null;
    status: string;
    sequence: number | null;
    notes: string | null;
    statusUpdatedAt: string;
    createdAt: string;
  };
  venue: {
    id: number;
    name: string;
    city: string;
    region: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    capacity: number | null;
    [key: string]: any; // For other venue properties
  };
  [key: string]: any; // For flexibility
}

// Define tour type
interface Tour {
  id: number;
  name: string;
  artistId: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  description: string | null;
  totalBudget: number | null;
  estimatedTravelDistance: number | null;
  estimatedTravelTime: number | null;
  initialOptimizationScore: number | null;
  initialTotalDistance: number | null;
  initialTravelTime: number | null;
  optimizationScore: number | null;
  createdAt: string;
  updatedAt: string | null;
  artist: {
    id: number;
    name: string;
    genres: string[];
    [key: string]: any;
  };
  optimizedVenues?: number[]; // IDs of venues in optimized order
  [key: string]: any; // For flexibility
}

export default function TourDetailPage() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const tourId = parseInt(id);
  const [showAllVenues, setShowAllVenues] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);

  // Fetch tour details
  const { 
    data: tour = {} as Tour, 
    isLoading: isTourLoading, 
    error: tourError,
    refetch: refetchTour
  } = useQuery<Tour>({
    queryKey: ['/api/tours', tourId],
    enabled: !isNaN(tourId),
  });

  // Fetch tour venues
  const {
    data: venues = [] as Venue[],
    isLoading: isVenuesLoading,
    error: venuesError
  } = useQuery<Venue[]>({
    queryKey: ['/api/tours', tourId, 'venues'],
    enabled: !isNaN(tourId),
  });

  // Define venues in order (original sequence)
  const originalSequenceVenues = venues && venues.length > 0 
    ? [...venues].sort((a, b) => {
        const seqA = a.tourVenue?.sequence !== undefined ? a.tourVenue.sequence : Infinity;
        const seqB = b.tourVenue?.sequence !== undefined ? b.tourVenue.sequence : Infinity;
        return (seqA || Infinity) - (seqB || Infinity);
      })
    : [];

  // Define optimized sequence venues (if available)
  const optimizedSequenceVenues = venues && venues.length > 0
    ? (tour.optimizedVenues && Array.isArray(tour.optimizedVenues) && tour.optimizedVenues.length > 0
        ? tour.optimizedVenues.map((venueId: number) => 
            venues.find(v => v.id === venueId)).filter(Boolean) as Venue[]
        : [...originalSequenceVenues])
    : [];

  // Handle venue click
  const handleVenueClick = (venue: any) => {
    setSelectedVenue(venue);
  };

  // Handle apply optimization
  const handleApplyOptimization = async () => {
    try {
      await refetchTour();
    } catch (error) {
      console.error('Failed to apply optimization:', error);
    }
  };

  if (isNaN(tourId)) {
    return <div>Invalid tour ID</div>;
  }

  const isLoading = isTourLoading || isVenuesLoading;
  const error = tourError || venuesError;

  if (isLoading) {
    return <TourDetailSkeleton />;
  }

  if (error) {
    console.error('Error in tour-detail.tsx:', error);
    let errorMessage = String(error);
    
    // Add more specific error handling
    if (error instanceof SyntaxError) {
      errorMessage = `JSON Parse Error: ${error.message}. This is likely due to a malformed response from the server.`;
    } else if (error instanceof TypeError) {
      errorMessage = `Type Error: ${error.message}. This might be due to accessing a property on an undefined value.`;
    }
    
    return (
      <div className="container px-4 md:px-6 py-6 space-y-6 max-w-7xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            <div className="mb-2">Error loading tour: {errorMessage}</div>
            <div className="p-2 bg-muted rounded text-xs max-h-32 overflow-y-auto">
              {String(error.stack || '')}
            </div>
            <div className="mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchTour()}
              >
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="container px-4 md:px-6 py-6 space-y-6 max-w-7xl mx-auto">
        <Alert variant="default">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Tour Not Found</AlertTitle>
          <AlertDescription>
            The requested tour could not be found.
            <div className="mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setLocation('/tours')}
              >
                Go Back to Tours
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container px-4 md:px-6 py-6 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => setLocation('/dashboard')}>Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => setLocation('/tours')}>Tours</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink>{tour.name}</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Tour Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-2" 
            onClick={() => setLocation('/tours')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tours
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{tour.name}</h1>
          <div className="flex items-center text-muted-foreground mt-1">
            <Calendar className="mr-1 h-4 w-4" />
            <span>
              {tour.startDate && formatDate(tour.startDate)} 
              {tour.startDate && tour.endDate && ' - '}
              {tour.endDate && formatDate(tour.endDate)}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm">
            <Share className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Tour Tabs */}
      <TourDetailTabs 
        tourId={tourId}
        venues={venues || []}
        tourData={tour}
        originalSequenceVenues={originalSequenceVenues}
        optimizedSequenceVenues={optimizedSequenceVenues}
        selectedVenue={selectedVenue}
        showAllVenues={showAllVenues}
        setShowAllVenues={setShowAllVenues}
        onVenueClick={handleVenueClick}
        onApplyOptimization={handleApplyOptimization}
        refetch={refetchTour}
      />
    </div>
  );
}

function TourDetailSkeleton() {
  return (
    <div className="container px-4 md:px-6 py-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      
      <Skeleton className="h-10 w-full mb-8" />
      
      <div className="space-y-8">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}