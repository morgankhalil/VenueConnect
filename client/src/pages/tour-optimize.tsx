import React from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { UnifiedTourOptimizer } from '@/components/tour/unified-tour-optimizer';
import { getTourById } from '@/lib/api';

// UI Components
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Icons
import { Home, ChevronRight, Music } from 'lucide-react';

/**
 * Tour Optimize Page
 * 
 * Provides a full-screen experience for the unified tour optimizer
 */
export default function OptimizeTour() {
  const { id } = useParams();
  const tourId = Number(id);
  
  // Fetch tour data
  const { data: tour, isLoading } = useQuery({
    queryKey: ['/api/tour/tours', tourId],
    queryFn: () => getTourById(tourId)
  });
  
  return (
    <div className="container py-8 space-y-6 max-w-7xl">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">
                <Home className="h-4 w-4" />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/tours">Tours</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/tours/${tourId}`}>{isLoading ? 'Tour Details' : tour?.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>Tour Optimizer</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="flex items-center">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
          <Music className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isLoading ? 'Loading Tour...' : `Optimize: ${tour?.name}`}
          </h1>
          <p className="text-muted-foreground">
            Streamlined tour optimization and venue recommendations
          </p>
        </div>
      </div>
      
      {tourId && <UnifiedTourOptimizer tourId={Number(tourId)} />}
    </div>
  );
}