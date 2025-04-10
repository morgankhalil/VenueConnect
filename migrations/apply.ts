
import { db } from '../server/db';
import { migrate } from 'drizzle-orm/neon-http/migrator';

async function main() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: 'migrations' });
  console.log('Migrations complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed!');
  console.error(err);
  process.exit(1);
});
