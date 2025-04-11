
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);

interface DocScanResult {
  filePath: string;
  status: 'implemented' | 'partial' | 'todo';
  lastUpdated: Date;
  mismatches: string[];
}

interface StatusMarker {
  status: string;
  description: string;
  line: number;
}

export class DocumentationScanner {
  private static statusRegex = /@(implemented|partial|todo)\s*(.*)/i;
  
  static async scanDirectory(dir: string): Promise<DocScanResult[]> {
    const results: DocScanResult[] = [];
    const files = await readdir(dir, { recursive: true });
    
    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const filePath = path.join(dir, file);
        const content = await readFile(filePath, 'utf-8');
        const markers = this.extractStatusMarkers(content);
        
        results.push({
          filePath,
          status: this.determineOverallStatus(markers),
          lastUpdated: fs.statSync(filePath).mtime,
          mismatches: []
        });
      }
    }
    
    return results;
  }

  static extractStatusMarkers(content: string): StatusMarker[] {
    const lines = content.split('\n');
    const markers: StatusMarker[] = [];
    
    lines.forEach((line, index) => {
      const match = this.statusRegex.exec(line);
      if (match) {
        markers.push({
          status: match[1],
          description: match[2]?.trim() || '',
          line: index + 1
        });
      }
    });
    
    return markers;
  }

  private static determineOverallStatus(markers: StatusMarker[]): 'implemented' | 'partial' | 'todo' {
    if (markers.length === 0) return 'todo';
    if (markers.some(m => m.status === 'implemented')) return 'implemented';
    if (markers.some(m => m.status === 'partial')) return 'partial';
    return 'todo';
  }
}
