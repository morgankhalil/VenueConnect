
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

interface DocScanResult {
  filePath: string;
  status: 'implemented' | 'partial' | 'todo';
  lastUpdated: Date;
  mismatches: string[];
}

export class DocumentationScanner {
  private static statusRegex = /@(implemented|partial|todo)\s*(.*)/i;
  
  static async scanDirectory(dir: string): Promise<DocScanResult[]> {
    const results: DocScanResult[] = [];
    await this.scanRecursive(dir, results);
    return results;
  }

  private static async scanRecursive(dir: string, results: DocScanResult[]): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip node_modules and hidden directories
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        if (entry.isDirectory()) {
          await this.scanRecursive(fullPath, results);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          try {
            const content = await readFile(fullPath, 'utf-8');
            const markers = this.extractStatusMarkers(content);
            const stats = await stat(fullPath);
            
            results.push({
              filePath: fullPath,
              status: this.determineOverallStatus(markers),
              lastUpdated: stats.mtime,
              mismatches: []
            });
          } catch (error) {
            console.error(`Error scanning file ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error);
    }
  }

  private static extractStatusMarkers(content: string): Array<{status: string, description: string, line: number}> {
    const lines = content.split('\n');
    const markers: Array<{status: string, description: string, line: number}> = [];
    
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

  private static determineOverallStatus(markers: Array<{status: string}>): 'implemented' | 'partial' | 'todo' {
    if (markers.length === 0) return 'todo';
    if (markers.some(m => m.status === 'implemented')) return 'implemented';
    if (markers.some(m => m.status === 'partial')) return 'partial';
    return 'todo';
  }
}
