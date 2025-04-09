import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Calendar, Users, Briefcase } from 'lucide-react';

type WebhookConfiguration = {
  id: number;
  name: string;
  type: string;
  description: string;
  callbackUrl: string;
  isEnabled: boolean;
  secretKey: string;
  configOptions: string;
  lastExecuted: string | null;
  createdAt: string;
};

const getIconForWebhookType = (type: string) => {
  switch (type) {
    case 'bandsintown_events':
      return <Calendar className="w-5 h-5 mr-2" />;
    case 'artist_updates':
      return <Users className="w-5 h-5 mr-2" />;
    case 'venue_capacity':
      return <Briefcase className="w-5 h-5 mr-2" />;
    default:
      return null;
  }
};

export function WebhookSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTestingWebhook, setIsTestingWebhook] = useState<number | null>(null);

  // Fetch webhook configurations
  const { data: webhooks, isLoading, error } = useQuery<WebhookConfiguration[]>({
    queryKey: ['/api/admin/webhook-configurations'],
    retry: 1
  });

  // Toggle webhook enabled/disabled
  const toggleWebhookMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      return apiRequest(`/api/admin/webhook-configurations/${id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enabled }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/webhook-configurations'] });
      toast({
        title: 'Webhook updated',
        description: 'The webhook configuration has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update webhook configuration.',
        variant: 'destructive',
      });
      console.error('Error toggling webhook:', error);
    },
  });

  // Test webhook connection
  const testWebhookMutation = useMutation({
    mutationFn: async (callbackUrl: string) => {
      return apiRequest('/api/admin/webhooks/test', {
        method: 'POST',
        body: JSON.stringify({ callbackUrl }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: (data) => {
      setIsTestingWebhook(null);
      if (data.success) {
        toast({
          title: 'Webhook test successful',
          description: 'The test webhook was sent successfully.',
        });
      } else {
        toast({
          title: 'Webhook test failed',
          description: data.message || 'The webhook test encountered an error.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      setIsTestingWebhook(null);
      toast({
        title: 'Error',
        description: 'Failed to test webhook connection.',
        variant: 'destructive',
      });
      console.error('Error testing webhook:', error);
    },
  });

  const handleToggleWebhook = (id: number, currentState: boolean) => {
    toggleWebhookMutation.mutate({ id, enabled: !currentState });
  };

  const handleTestWebhook = (id: number, callbackUrl: string) => {
    setIsTestingWebhook(id);
    testWebhookMutation.mutate(callbackUrl);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-destructive mb-2" />
          <p>Failed to load webhook configurations.</p>
          <p className="text-sm text-muted-foreground">Please try again later or contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Webhook Configurations</h2>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {webhooks && webhooks.length > 0 ? (
          webhooks.map((webhook: WebhookConfiguration) => (
            <Card key={webhook.id} className={webhook.isEnabled ? 'border-primary/50' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getIconForWebhookType(webhook.type)}
                    <CardTitle>{webhook.name}</CardTitle>
                  </div>
                  <Badge variant={webhook.isEnabled ? 'default' : 'outline'}>
                    {webhook.isEnabled ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardDescription className="mt-2">{webhook.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Callback URL:</span>{' '}
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">{webhook.callbackUrl}</code>
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>{' '}
                    <span className="text-muted-foreground">{webhook.type}</span>
                  </div>
                  {webhook.lastExecuted && (
                    <div>
                      <span className="font-medium">Last executed:</span>{' '}
                      <span className="text-muted-foreground">
                        {new Date(webhook.lastExecuted).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`webhook-toggle-${webhook.id}`}
                    checked={webhook.isEnabled}
                    onCheckedChange={() => handleToggleWebhook(webhook.id, webhook.isEnabled)}
                    disabled={toggleWebhookMutation.isPending}
                  />
                  <label htmlFor={`webhook-toggle-${webhook.id}`} className="text-sm">
                    {webhook.isEnabled ? 'Enabled' : 'Disabled'}
                  </label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestWebhook(webhook.id, webhook.callbackUrl)}
                  disabled={isTestingWebhook === webhook.id || testWebhookMutation.isPending}
                >
                  {isTestingWebhook === webhook.id ? (
                    <>
                      <Spinner className="h-3 w-3 mr-2" />
                      Testing...
                    </>
                  ) : (
                    'Test Webhook'
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-2 flex flex-col items-center justify-center p-6 bg-muted/50 rounded-lg">
            <div className="text-center">
              <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-lg font-medium">No webhook configurations found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Webhook configurations will appear here once they are created.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}