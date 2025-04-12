import { exec } from 'child_process';
import path from 'path';

/**
 * Run the complete standardization migration
 */
async function main() {
  console.log('Running complete standardization migration...');

  const migrationPath = path.resolve(__dirname, 'complete-standardization.ts');
  
  return new Promise<void>((resolve, reject) => {
    const command = `npx tsx ${migrationPath}`;
    
    console.log(`Executing: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running migration: ${error.message}`);
        console.error(stderr);
        reject(error);
        return;
      }
      
      console.log(stdout);
      console.log('Complete standardization migration executed successfully');
      resolve();
    });
  });
}

main()
  .then(() => {
    console.log('Migration runner completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration runner failed:', error);
    process.exit(1);
  });