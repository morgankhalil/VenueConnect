
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface DocScanResult {
  filePath: string;
  status: 'implemented' | 'partial' | 'todo';
  lastUpdated: Date;
  mismatches: string[];
}

export default function DocumentationPage() {
  const [results, setResults] = useState<DocScanResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runScan = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/documentation/scan');
      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Failed to run documentation scan:', error);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Documentation Status</h1>
        <Button onClick={runScan} disabled={loading}>
          {loading ? 'Scanning...' : 'Run Documentation Scan'}
        </Button>
      </div>

      <ScrollArea className="h-[600px]">
        {results.map((result, index) => (
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
        ))}
      </ScrollArea>
    </div>
  );
}
