import { TourList } from '@/components/tour/tour-list';
import { PageHeader } from '@/components/layout/page-header';
import { Truck } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';

export default function ToursPage() {
  return (
    <MainLayout>
      <div className="container max-w-screen-xl mx-auto px-4 py-8">
        <PageHeader
          title="Tour Management"
          description="Plan, optimize, and manage your artist tours"
          icon={<Truck size={28} />}
        />
        <div className="mt-8">
          <TourList />
        </div>
      </div>
    </MainLayout>
  );
}