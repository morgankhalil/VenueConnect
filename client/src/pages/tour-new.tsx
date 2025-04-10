import { useLocation } from 'wouter';
import { TourForm } from '@/components/tour/tour-form';
import { PageHeader } from '@/components/layout/page-header';
import { PlusCircle } from 'lucide-react';

export default function NewTourPage() {
  const [_, navigate] = useLocation();
  
  const handleSuccess = (data: any) => {
    // After tour creation, navigate to the tour detail page
    if (data && data.id) {
      navigate(`/tours/${data.id}`);
    } else {
      navigate('/tours');
    }
  };
  
  return (
    <div className="container py-6">
      <PageHeader
        title="Create New Tour"
        description="Set up a new tour for an artist"
        icon={<PlusCircle size={28} />}
        backLink="/tours"
        backLinkText="Back to Tours"
      />
      <div className="mt-6 max-w-3xl mx-auto">
        <TourForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}