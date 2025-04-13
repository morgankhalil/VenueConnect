import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import axios from 'axios';

interface AIEnhancerProps {
  entityType: 'venue' | 'artist';
  entityId?: number;
  initialData?: any;
  onEnhanced?: (enhancedData: any) => void;
}

export default function AIEnhancer({ entityType, entityId, initialData, onEnhanced }: AIEnhancerProps) {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [enhancementResult, setEnhancementResult] = useState<string>('');
  const [generateDescription, setGenerateDescription] = useState<boolean>(true);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [entityData, setEntityData] = useState<any>(initialData || {});
  
  const { toast } = useToast();
  
  // Check initialization status
  const checkInitialization = async () => {
    try {
      const response = await axios.get('/api/ai/status');
      setIsInitialized(response.data.initialized);
    } catch (error) {
      console.error('Error checking AI status:', error);
      toast({
        title: 'Error',
        description: 'Could not check AI service status',
        variant: 'destructive',
      });
    }
  };
  
  // Initialize on component mount
  React.useEffect(() => {
    checkInitialization();
  }, []);
  
  // Initialize the AI service
  const initializeAI = async () => {
    if (!apiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your OpenAI API key',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post('/api/ai/initialize', { openaiKey: apiKey });
      
      if (response.data.success) {
        setIsInitialized(true);
        toast({
          title: 'Success',
          description: 'AI enhancement service initialized successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to initialize AI service',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error initializing AI service:', error);
      toast({
        title: 'Error',
        description: 'Could not initialize AI service',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Generate preview description without saving
  const generatePreview = async () => {
    if (!isInitialized) {
      toast({
        title: 'Not Initialized',
        description: 'Please initialize the AI service first',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const endpoint = entityType === 'venue' 
        ? '/api/ai/preview-venue-description'
        : '/api/ai/preview-artist-description';
      
      const requestData = entityType === 'venue'
        ? { venue: entityData }
        : { artist: entityData };
      
      const response = await axios.post(endpoint, requestData);
      
      if (response.data.success) {
        setEnhancementResult(response.data.description);
        toast({
          title: 'Preview Generated',
          description: 'Description preview generated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to generate preview',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: 'Error',
        description: 'Could not generate preview description',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Enhance entity data and save to database
  const enhanceEntity = async () => {
    if (!isInitialized) {
      toast({
        title: 'Not Initialized',
        description: 'Please initialize the AI service first',
        variant: 'destructive',
      });
      return;
    }
    
    if (!entityId) {
      toast({
        title: 'Entity ID Required',
        description: `Please select a ${entityType} to enhance`,
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const endpoint = entityType === 'venue'
        ? `/api/ai/enhance-venue/${entityId}`
        : `/api/ai/enhance-artist/${entityId}`;
      
      const response = await axios.post(endpoint, { 
        generateDescription 
      });
      
      if (response.data.success) {
        const enhancedData = entityType === 'venue' 
          ? response.data.venue 
          : response.data.artist;
        
        setEnhancementResult(enhancedData.description || '');
        
        if (onEnhanced) {
          onEnhanced(enhancedData);
        }
        
        toast({
          title: 'Enhancement Complete',
          description: `${entityType === 'venue' ? 'Venue' : 'Artist'} data enhanced successfully`,
        });
      } else {
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to enhance data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error enhancing entity:', error);
      toast({
        title: 'Error',
        description: `Could not enhance ${entityType} data`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Update entity data for preview
  const handleDataChange = (field: string, value: any) => {
    setEntityData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI Data Enhancer</CardTitle>
        <CardDescription>
          Enhance {entityType} data with AI-generated descriptions and metadata
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue={isInitialized ? 'enhance' : 'setup'}>
          <TabsList className="mb-4">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="enhance" disabled={!isInitialized}>Enhance</TabsTrigger>
            <TabsTrigger value="preview" disabled={!isInitialized}>Preview</TabsTrigger>
          </TabsList>
          
          {/* Setup Tab */}
          <TabsContent value="setup">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Your API key is required to use the AI enhancement features.
                  It will not be stored on the server.
                </p>
              </div>
              
              <Button 
                onClick={initializeAI} 
                disabled={loading || !apiKey}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isInitialized ? 'Reinitialize' : 'Initialize'} AI Service
              </Button>
              
              {isInitialized && (
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded text-sm">
                  ✓ AI enhancement service is initialized and ready to use
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Enhance Tab */}
          <TabsContent value="enhance">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="generate-description"
                  checked={generateDescription}
                  onCheckedChange={setGenerateDescription}
                />
                <Label htmlFor="generate-description">Generate Description</Label>
              </div>
              
              <p className="text-sm text-muted-foreground">
                The AI will enhance the {entityType}'s metadata and optionally generate a new description.
              </p>
              
              <Button 
                onClick={enhanceEntity} 
                disabled={loading || !entityId}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enhance {entityType === 'venue' ? 'Venue' : 'Artist'} Data
              </Button>
              
              {enhancementResult && (
                <div className="mt-4 space-y-2">
                  <Label>Enhanced Description</Label>
                  <div className="p-3 border rounded-md bg-slate-50 dark:bg-slate-900">
                    {enhancementResult}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Preview Tab */}
          <TabsContent value="preview">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="entity-name">Name</Label>
                <Input
                  id="entity-name"
                  value={entityData?.name || ''}
                  onChange={(e) => handleDataChange('name', e.target.value)}
                  placeholder={entityType === 'venue' ? 'Venue name' : 'Artist name'}
                />
              </div>
              
              {entityType === 'venue' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="entity-city">City</Label>
                    <Input
                      id="entity-city"
                      value={entityData?.city || ''}
                      onChange={(e) => handleDataChange('city', e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="entity-region">Region/State</Label>
                      <Input
                        id="entity-region"
                        value={entityData?.region || ''}
                        onChange={(e) => handleDataChange('region', e.target.value)}
                        placeholder="Region/State"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="entity-country">Country</Label>
                      <Input
                        id="entity-country"
                        value={entityData?.country || 'US'}
                        onChange={(e) => handleDataChange('country', e.target.value)}
                        placeholder="Country"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="entity-venue-type">Venue Type</Label>
                    <Input
                      id="entity-venue-type"
                      value={entityData?.venueType || ''}
                      onChange={(e) => handleDataChange('venueType', e.target.value)}
                      placeholder="club, bar, theater, etc."
                    />
                  </div>
                </>
              )}
              
              {entityType === 'artist' && (
                <div className="space-y-2">
                  <Label htmlFor="entity-genres">Genres</Label>
                  <Input
                    id="entity-genres"
                    value={(entityData?.genres || []).join(', ')}
                    onChange={(e) => handleDataChange('genres', e.target.value.split(', '))}
                    placeholder="rock, indie, etc."
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="entity-description">Current Description</Label>
                <Textarea
                  id="entity-description"
                  value={entityData?.description || ''}
                  onChange={(e) => handleDataChange('description', e.target.value)}
                  placeholder="Enter current description or leave blank to generate a new one"
                  rows={4}
                />
              </div>
              
              <Button 
                onClick={generatePreview} 
                disabled={loading}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Description Preview
              </Button>
              
              {enhancementResult && (
                <div className="mt-4 space-y-2">
                  <Label>Generated Description</Label>
                  <div className="p-3 border rounded-md bg-slate-50 dark:bg-slate-900">
                    {enhancementResult}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <p className="text-xs text-muted-foreground">
          Powered by OpenAI
        </p>
      </CardFooter>
    </Card>
  );
}