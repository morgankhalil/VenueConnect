import { execSync } from 'child_process';

// Run the column name standardization migration
console.log('Running column name standardization migration...');
try {
  execSync('tsx migrations/column_name_standardization.ts', { stdio: 'inherit' });
  console.log('Migration completed successfully.');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}