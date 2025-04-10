import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { getTour } from '@/lib/api';
import { TourForm } from '@/components/tour/tour-form';
import { PageHeader } from '@/components/layout/page-header';
import { PenLine, Loader2 } from 'lucide-react';

export default function EditTourPage() {
  const [match, params] = useRoute('/tours/:id/edit');
  const [_, navigate] = useLocation();
  const [defaultValues, setDefaultValues] = useState<any>(null);
  
  // Get tour data for pre-filling the form
  const { data: tour, isLoading, error } = useQuery({
    queryKey: ['/api/tour/tours', params?.id],
    queryFn: () => getTour(Number(params?.id)),
    enabled: !!params?.id,
  });
  
  useEffect(() => {
    if (tour) {
      // Format dates for the form
      const formattedTour = {
        ...tour,
        startDate: tour.startDate ? new Date(tour.startDate) : undefined,
        endDate: tour.endDate ? new Date(tour.endDate) : undefined,
      };
      setDefaultValues(formattedTour);
    }
  }, [tour]);
  
  const handleSuccess = () => {
    // Navigate back to tour detail page
    navigate(`/tours/${params?.id}`);
  };
  
  if (!match || !params?.id) {
    return <div>Invalid tour ID</div>;
  }
  
  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex justify-center items-center h-60">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container py-6">
        <div className="text-center">
          <h2 className="text-lg font-medium">Error Loading Tour</h2>
          <p className="text-muted-foreground mt-2">
            Failed to load tour details. Please try again later.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container py-6">
      <PageHeader
        title="Edit Tour"
        description="Update tour details and settings"
        icon={<PenLine size={28} />}
        backLink={`/tours/${params?.id}`}
        backLinkText="Back to Tour"
      />
      <div className="mt-6 max-w-3xl mx-auto">
        {defaultValues ? (
          <TourForm 
            tourId={Number(params?.id)} 
            defaultValues={defaultValues} 
            onSuccess={handleSuccess} 
          />
        ) : (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}