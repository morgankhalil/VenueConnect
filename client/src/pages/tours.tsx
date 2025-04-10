import { TourList } from '@/components/tour/tour-list';
import { PageHeader } from '@/components/layout/page-header';
import { Truck } from 'lucide-react';

export default function ToursPage() {
  return (
    <div className="container py-6">
      <PageHeader
        title="Tour Management"
        description="Plan, optimize, and manage your artist tours"
        icon={<Truck size={28} />}
      />
      <div className="mt-6">
        <TourList />
      </div>
    </div>
  );
}