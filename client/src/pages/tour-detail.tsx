import { useRoute } from 'wouter';
import { TourDetail } from '@/components/tour/tour-detail';
import { PageHeader } from '@/components/layout/page-header';
import { Truck } from 'lucide-react';

export default function TourDetailPage() {
  // Extract tour ID from URL
  const [match, params] = useRoute('/tours/:id');
  
  if (!match || !params?.id) {
    return <div>Invalid tour ID</div>;
  }
  
  return (
    <div className="container py-6">
      <PageHeader
        title="Tour Details"
        description="View and manage tour details"
        icon={<Truck size={28} />}
        backLink="/tours"
        backLinkText="Back to Tours"
      />
      <div className="mt-6">
        <TourDetail tourId={params.id} />
      </div>
    </div>
  );
}