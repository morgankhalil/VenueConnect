
import fs from 'fs';
import path from 'path';

interface ImplementationStatus {
  taskName: string;
  status: string;
}

export class StatusUpdater {
  private static readonly statusFile = 'IMPLEMENTATION_TASK_TRACKER.md';
  
  static async updateTaskStatus(updates: ImplementationStatus[]): Promise<void> {
    const content = await fs.promises.readFile(this.statusFile, 'utf-8');
    let updatedContent = content;
    
    updates.forEach(update => {
      const regex = new RegExp(`(\\|\\s*${update.taskName}\\s*\\|.*\\|.*\\|.*\\|\\s*)([^\\|]*)(\\s*\\|)`, 'g');
      updatedContent = updatedContent.replace(regex, `$1${update.status}$3`);
    });
    
    await fs.promises.writeFile(this.statusFile, updatedContent, 'utf-8');
  }
}
