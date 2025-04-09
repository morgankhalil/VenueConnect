import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, CheckCircle, ExternalLink, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { setBandsintownApiKey } from "@/lib/api";

interface APIKeySettingsProps {
  apiKeyConfigured: boolean;
  onApiKeyConfigured: () => void;
}

export function APIKeySettings({ apiKeyConfigured, onApiKeyConfigured }: APIKeySettingsProps) {
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();

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
        onApiKeyConfigured(); // Notify parent component that API key is configured
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
    <Card>
      <CardHeader>
        <CardTitle>Bandsintown API Configuration</CardTitle>
        <CardDescription>
          Configure your Bandsintown API key to enable integration with their services.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {apiKeyConfigured ? (
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
          {apiKeyConfigured ? "Update API Key" : "Save API Key"}
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
  );
}