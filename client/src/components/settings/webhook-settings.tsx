import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface WebhookSettingsProps {
  apiKeyConfigured: boolean;
}

export function WebhookSettings({ apiKeyConfigured }: WebhookSettingsProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  // Mutation for registering webhook
  const registerWebhook = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/webhooks/register', {
        callbackUrl: webhookUrl
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Webhook Registered",
          description: "Successfully registered webhook with Bandsintown"
        });
        setWebhookEnabled(true);
      } else {
        toast({
          title: "Registration Failed",
          description: data.message || "Failed to register webhook",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Registration Error",
        description: error instanceof Error ? error.message : "Unknown error registering webhook",
        variant: "destructive"
      });
    }
  });

  // Mutation for unregistering webhook
  const unregisterWebhook = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/webhooks/unregister', {
        callbackUrl: webhookUrl
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Webhook Unregistered",
          description: "Successfully unregistered webhook from Bandsintown"
        });
        setWebhookEnabled(false);
      } else {
        toast({
          title: "Unregistration Failed",
          description: data.message || "Failed to unregister webhook",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Unregistration Error",
        description: error instanceof Error ? error.message : "Unknown error unregistering webhook",
        variant: "destructive"
      });
    }
  });

  // Mutation for testing webhook
  const testWebhook = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/webhooks/test', {
        callbackUrl: webhookUrl
      });
      return response.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      if (data.success) {
        toast({
          title: "Test Successful",
          description: "Webhook test was successful"
        });
      } else {
        toast({
          title: "Test Failed",
          description: data.message || "Failed to test webhook",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error testing webhook"
      });
      toast({
        title: "Test Error",
        description: error instanceof Error ? error.message : "Unknown error testing webhook",
        variant: "destructive"
      });
    }
  });

  const handleRegisterWebhook = () => {
    if (!webhookUrl) {
      toast({
        title: "Missing URL",
        description: "Please enter a webhook URL",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Simple URL validation
      new URL(webhookUrl);
      registerWebhook.mutate();
    } catch (error) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive"
      });
    }
  };

  const handleUnregisterWebhook = () => {
    if (!webhookUrl) {
      toast({
        title: "Missing URL",
        description: "Please enter a webhook URL to unregister",
        variant: "destructive"
      });
      return;
    }
    
    unregisterWebhook.mutate();
  };

  const handleTestWebhook = () => {
    if (!webhookUrl) {
      toast({
        title: "Missing URL",
        description: "Please enter a webhook URL to test",
        variant: "destructive"
      });
      return;
    }
    
    testWebhook.mutate();
  };

  const isLoading = registerWebhook.isPending || unregisterWebhook.isPending || testWebhook.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Integration</CardTitle>
        <CardDescription>
          Receive real-time updates when events are created, updated, or canceled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!apiKeyConfigured && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>API Key Required</AlertTitle>
            <AlertDescription>
              You need to configure your Bandsintown API key before setting up webhooks.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook URL</Label>
          <Input
            id="webhook-url"
            placeholder="https://your-webhook-endpoint.com/api/webhooks/bandsintown"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            disabled={isLoading || !apiKeyConfigured}
          />
          <p className="text-xs text-muted-foreground">
            Enter the URL where Bandsintown should send webhook events
          </p>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label htmlFor="webhook-enabled">Webhook Status</Label>
            <p className="text-xs text-muted-foreground">
              Enable or disable webhook integration
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="webhook-enabled"
              checked={webhookEnabled}
              disabled={isLoading || !apiKeyConfigured}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleRegisterWebhook();
                } else {
                  handleUnregisterWebhook();
                }
              }}
            />
            <Label htmlFor="webhook-enabled">
              {webhookEnabled ? "Enabled" : "Disabled"}
            </Label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-4">
          <Button
            variant="outline"
            onClick={handleTestWebhook}
            disabled={isLoading || !apiKeyConfigured}
          >
            {testWebhook.isPending ? <Spinner className="mr-2" /> : null}
            Test Webhook
          </Button>

          <Button
            variant={webhookEnabled ? "outline" : "default"}
            onClick={handleRegisterWebhook}
            disabled={isLoading || webhookEnabled || !apiKeyConfigured}
          >
            {registerWebhook.isPending ? <Spinner className="mr-2" /> : null}
            Register Webhook
          </Button>

          <Button
            variant="outline"
            className={webhookEnabled ? "" : "hidden"}
            onClick={handleUnregisterWebhook}
            disabled={isLoading || !webhookEnabled || !apiKeyConfigured}
          >
            {unregisterWebhook.isPending ? <Spinner className="mr-2" /> : null}
            Unregister Webhook
          </Button>
        </div>

        {testResult && (
          <Alert variant={testResult.success ? "default" : "destructive"} className="mt-4">
            {testResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{testResult.success ? "Test Successful" : "Test Failed"}</AlertTitle>
            <AlertDescription>{testResult.message}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Webhook Documentation</h4>
          <p className="text-xs text-muted-foreground">
            Webhooks allow your application to receive real-time updates from Bandsintown
            when events are created, updated, or canceled.
          </p>
          <Button variant="link" className="p-0 h-auto text-xs mt-2" asChild>
            <a href="https://bandsintown.com/api" target="_blank" rel="noopener noreferrer">
              Learn More <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}