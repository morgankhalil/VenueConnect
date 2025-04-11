import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { getTours, apiRequest } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { Loader2, MapPin, Calendar, User, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function TourList() {
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [_, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  console.log("Fetching tours with filter:", filterStatus);
  const { data: tours, isLoading, error, isError } = useQuery({
    queryKey: ['api/tours', filterStatus],
    queryFn: () => getTours({ status: filterStatus }),
    retry: 3,
    staleTime: 30000, // 30 seconds
  });
  
  // Mutation for creating a demo tour
  const createDemoTourMutation = useMutation({
    mutationFn: async () => {
      // Updated path to match the server-side route
      const response = await fetch('/api/tours/create-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to create demo tour');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate tours query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['api/tours'] });
      
      toast({
        title: "Demo Tour Created",
        description: "A new demo tour has been created with venues ready for optimization.",
      });
      
      // Navigate to the optimization page for the new tour
      if (data && data.redirectUrl) {
        navigate(data.redirectUrl);
      } else if (data && data.id) {
        navigate(`/tours/${data.id}/optimize`);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create demo tour. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleCreateDemoTour = () => {
    createDemoTourMutation.mutate();
  };
  
  const handleStatusChange = (value: string) => {
    setFilterStatus(value === 'all' ? undefined : value);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Tours</CardTitle>
          <CardDescription>There was an error loading the tours.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load tours. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Tours</CardTitle>
            <CardDescription>Manage your tours and optimize routes</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select onValueChange={handleStatusChange} defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tours</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={handleCreateDemoTour}
              disabled={createDemoTourMutation.isPending}
              className="flex items-center"
            >
              <Sparkles className="mr-1 h-4 w-4" />
              {createDemoTourMutation.isPending ? 'Creating...' : 'Create Demo Tour'}
            </Button>
            
            <Link href="/tours/new">
              <Button>Create Tour</Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tours && tours.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Optimization</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tours.map((tour) => (
                <TableRow key={tour.id}>
                  <TableCell className="font-medium">
                    <Link href={`/tours/${tour.id}`}>
                      <span className="text-primary cursor-pointer hover:underline">
                        {tour.name}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      {tour.artistName || 'Unknown Artist'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      {tour.startDate && tour.endDate ? (
                        `${formatDate(tour.startDate)} - ${formatDate(tour.endDate)}`
                      ) : (
                        'Date range not set'
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <TourStatusBadge status={tour.status} />
                  </TableCell>
                  <TableCell>
                    {tour.optimizationScore ? (
                      <span className="font-medium">{tour.optimizationScore.toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground">Not optimized</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/tours/${tour.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                      <Link href={`/tours/${tour.id}/optimize`}>
                        <Button variant="outline" size="sm">Optimize</Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">No tours found</div>
            <Link href="/tours/new">
              <Button>Create Your First Tour</Button>
            </Link>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t p-4 text-xs text-muted-foreground">
        Tours are shown with their current status and optimization score.
      </CardFooter>
    </Card>
  );
}

function TourStatusBadge({ status }: { status: string }) {
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
  
  switch (status) {
    case 'planning':
      variant = 'outline';
      break;
    case 'booked':
      variant = 'secondary';
      break;
    case 'in-progress':
      variant = 'default';
      break;
    case 'completed':
      variant = 'default';
      break;
    case 'cancelled':
      variant = 'destructive';
      break;
  }
  
  return <Badge variant={variant}>{status || 'Unknown'}</Badge>;
}