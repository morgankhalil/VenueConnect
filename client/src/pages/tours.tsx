import { TourList } from '@/components/tour/tour-list';
import { PageHeader } from '@/components/layout/page-header';
import { Truck } from 'lucide-react';

export default function ToursPage() {
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <PageHeader
          title="Tour Management"
          description="Plan, optimize, and manage your artist tours"
          icon={<Truck size={28} />}
        />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mt-8">
          <TourList />
        </div>
      </div>
    </div>
  );
}

// @implemented Tour listing with filtering and sorting
// @partial Tour comparison feature
// @todo Add bulk tour operations