import { useRoute, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { Truck, Wand2 } from 'lucide-react';
import { OptimizationWizard } from '@/components/tour/optimization-wizard';
import { queryClient } from '@/lib/queryClient';

export default function TourWizardPage() {
  const [match, params] = useRoute('/tours/:id/wizard');
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  
  if (!match || !params?.id) {
    return <div>Invalid tour ID</div>;
  }
  
  return (
    <div className="container py-6">
      <PageHeader
        title="AI Route Optimization Wizard"
        description="Create a customized tour route based on your preferences and constraints"
        icon={<Wand2 size={28} />}
        backLink={`/tours/${params?.id}`}
        backLinkText="Back to Tour"
      />
      
      <div className="mt-6 max-w-5xl mx-auto bg-card rounded-lg border p-6">
        <OptimizationWizard 
          tourId={Number(params?.id)} 
          onComplete={(result) => {
            toast({
              title: 'AI Optimization Complete',
              description: `Tour optimized with personalized preferences. Score: ${result.optimizationScore.toFixed(2)}`,
            });
            
            // Invalidate tour data to ensure fresh data
            queryClient.invalidateQueries({
              queryKey: ['/api/tour/tours', params?.id]
            });
            
            // Navigate back to the tour detail page
            navigate(`/tours/${params?.id}`);
          }}
          onCancel={() => {
            navigate(`/tours/${params?.id}`);
          }}
        />
      </div>
    </div>
  );
}