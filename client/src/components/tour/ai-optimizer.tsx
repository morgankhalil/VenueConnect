import { useEffect } from 'react';
import { useNavigate } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles } from 'lucide-react';

/**
 * This component is deprecated and serves as a redirect to the unified tour optimizer.
 * It still shows the same button, but when clicked, it redirects to the unified optimizer page.
 */
export function AITourOptimizer({ tourId, onApplyChanges }: { tourId: number; onApplyChanges?: () => void }) {
  const [_, navigate] = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.warn(
      'AITourOptimizer is deprecated. Please use UnifiedTourOptimizer from @/components/tour/unified-tour-optimizer.tsx instead.'
    );
  }, []);

  const handleClick = () => {
    toast({
      title: "Tour Optimization",
      description: "Redirecting to the unified tour optimizer page, which includes AI optimization.",
    });
    
    // Navigate to the unified tour optimizer page
    navigate(`/tours/${tourId}/optimize`);
  };

  return (
    <Button 
      variant="outline" 
      className="flex items-center gap-2 border-dashed" 
      onClick={handleClick}
    >
      <div className="relative">
        <Brain size={16} />
        <Sparkles className="absolute -bottom-1 -right-1 h-3 w-3 text-primary" />
      </div>
      <span>AI Optimize</span>
    </Button>
  );
}