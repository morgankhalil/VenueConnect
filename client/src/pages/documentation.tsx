
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DocScanResult {
  filePath: string;
  status: 'implemented' | 'partial' | 'todo';
  lastUpdated: Date;
  mismatches: string[];
}

export default function DocumentationPage() {
  const [results, setResults] = useState<DocScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/documentation/scan');
      const data = await response.json();
      if (!data.success && data.error) {
        throw new Error(data.error.message || 'Failed to scan documentation');
      }
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run documentation scan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Documentation Status</h1>
        <Button onClick={runScan} disabled={loading}>
          {loading ? 'Scanning...' : 'Run Documentation Scan'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ScrollArea className="h-[600px]">
        {results.length === 0 ? (
          <Card className="p-4">
            <p className="text-center text-muted-foreground">
              No scan results available. Click "Run Documentation Scan" to begin.
            </p>
          </Card>
        ) : (
          results.map((result, index) => (
            <Card key={index} className="p-4 mb-4">
              <div className="flex justify-between items-center">
                <p className="font-medium">{result.filePath}</p>
                <Badge variant={
                  result.status === 'implemented' ? 'success' :
                  result.status === 'partial' ? 'warning' : 'destructive'
                }>
                  {result.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Last updated: {new Date(result.lastUpdated).toLocaleString()}
              </p>
            </Card>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
