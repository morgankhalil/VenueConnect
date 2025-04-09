import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { WebhookSettings } from "@/components/settings/webhook-settings";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, KeyRound, ExternalLink } from "lucide-react";
import { checkBandsintownApiKeyStatus, setBandsintownApiKey } from "@/lib/api";

export default function AdminSettings() {
  const [apiKey, setApiKey] = useState("");
  const [bandsintownApiStatus, setBandsintownApiStatus] = useState<{ configured: boolean } | null>(null);
  const [isApiStatusLoading, setIsApiStatusLoading] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch API key status on component mount
  useEffect(() => {
    async function checkApiKeyStatus() {
      try {
        setIsApiStatusLoading(true);
        const status = await checkBandsintownApiKeyStatus();
        setBandsintownApiStatus(status);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to check API key status. You might not have admin permissions.",
          variant: "destructive",
        });
      } finally {
        setIsApiStatusLoading(false);
      }
    }
    
    checkApiKeyStatus();
  }, [toast]);

  // Mutation for setting API key
  const setApiKeyMutation = useMutation({
    mutationFn: async () => {
      return setBandsintownApiKey(apiKey);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "API Key Configured",
          description: "Bandsintown API key has been configured successfully"
        });
        setApiKey(""); // Clear the field after successful configuration
        // Refresh API key status
        checkBandsintownApiKeyStatus().then(status => {
          setBandsintownApiStatus(status);
        });
      } else {
        toast({
          title: "Configuration Failed",
          description: data.message || "Failed to configure API key",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Configuration Error",
        description: error instanceof Error ? error.message : "Unknown error configuring API key",
        variant: "destructive"
      });
    }
  });

  const handleSetApiKey = () => {
    if (!apiKey) {
      toast({
        title: "Missing API Key",
        description: "Please enter an API key",
        variant: "destructive"
      });
      return;
    }
    
    setApiKeyMutation.mutate();
  };

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground">
          Configure API keys and webhook settings for the application.
        </p>
      </div>

      <div className="grid gap-8">
        {/* API Key Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Bandsintown API Configuration</CardTitle>
            <CardDescription>
              Configure your Bandsintown API key to enable integration with their services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isApiStatusLoading ? (
              <div className="flex items-center justify-center py-4">
                <Spinner className="mr-2" /> Loading API key status...
              </div>
            ) : bandsintownApiStatus?.configured ? (
              <Alert className="mb-4">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>API Key Configured</AlertTitle>
                <AlertDescription>
                  Your Bandsintown API key is currently configured and active.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>API Key Required</AlertTitle>
                <AlertDescription>
                  You need to configure your Bandsintown API key to enable webhook integration and event syncing.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="flex items-center">
                <KeyRound className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">API Key</span>
              </div>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your Bandsintown API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={setApiKeyMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                This API key will be stored securely and never exposed to clients
              </p>
            </div>

            <Button
              onClick={handleSetApiKey}
              disabled={setApiKeyMutation.isPending || !apiKey}
            >
              {setApiKeyMutation.isPending ? <Spinner className="mr-2" /> : null}
              {bandsintownApiStatus?.configured ? "Update API Key" : "Save API Key"}
            </Button>

            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Bandsintown API Documentation</h4>
              <p className="text-xs text-muted-foreground">
                Bandsintown provides APIs for accessing event data, artist information, and venue details.
                You'll need to sign up for an API key on their developer portal.
              </p>
              <Button variant="link" className="p-0 h-auto text-xs mt-2" asChild>
                <a href="https://bandsintown.com/api" target="_blank" rel="noopener noreferrer">
                  Bandsintown for Developers <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Settings */}
        <WebhookSettings 
          apiKeyConfigured={!!bandsintownApiStatus?.configured} 
        />
      </div>
    </div>
  );
}