
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

export default function DataSeedingPage() {
  const { toast } = useToast();

  const seedMutation = useMutation({
    mutationFn: async (operation: string) => {
      const response = await fetch(`/api/admin/seed/${operation}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Seeding failed');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Seeding operation completed successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to run seeding operation",
        variant: "destructive"
      });
    }
  });

  const handleSeed = (operation: string) => {
    seedMutation.mutate(operation);
  };

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Data Seeding</h1>
        <p className="text-muted-foreground">
          Manage and run data seeding operations for the application.
        </p>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Sample Data Seeding</CardTitle>
            <CardDescription>
              Seed the database with sample data for testing and development.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => handleSeed('sample')}
                disabled={seedMutation.isPending}
              >
                {seedMutation.isPending ? <Spinner className="mr-2" /> : null}
                Seed Sample Data
              </Button>
              
              <Button 
                onClick={() => handleSeed('concerts')}
                disabled={seedMutation.isPending}
                variant="secondary"
              >
                Seed from Concerts API
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clear Database</CardTitle>
            <CardDescription>
              Clear all data from the database. Use with caution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive"
              onClick={() => handleSeed('clear')}
              disabled={seedMutation.isPending}
            >
              Clear All Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
