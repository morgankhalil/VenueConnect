
import { DocumentationScanner } from './doc-scanner';
import { StatusUpdater } from './status-updater';
import path from 'path';
import chokidar from 'chokidar';

// Function to run documentation automation
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
// Watch for file changes
export function watchForChanges() {
  const watcher = chokidar.watch(['**/*.ts', '**/*.tsx'], {
    ignored: /(node_modules|\.git)/,
    persistent: true
  });

  watcher.on('change', async (filepath) => {
    console.log(`File ${filepath} changed, updating documentation...`);
    await runDocumentationAutomation();
  });

  console.log('Documentation watcher started');
}
