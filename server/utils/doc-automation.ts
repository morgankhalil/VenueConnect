
import { DocumentationScanner } from './doc-scanner';
import { StatusUpdater } from './status-updater';
import path from 'path';

export async function runDocumentationAutomation() {
  try {
    // Scan codebase for status markers
    const results = await DocumentationScanner.scanDirectory('.');
    
    // Convert scan results to status updates
    const updates = results.map(result => ({
      taskName: path.basename(result.filePath, path.extname(result.filePath)),
      status: result.status
    }));
    
    // Update the implementation tracker
    await StatusUpdater.updateTaskStatus(updates);
    
    console.log('Documentation automation completed successfully');
    return { success: true, results };
  } catch (error) {
    console.error('Documentation automation failed:', error);
    return { success: false, error };
  }
}
