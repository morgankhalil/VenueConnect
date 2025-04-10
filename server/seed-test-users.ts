
import { db } from './db';
import { users, venues } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function seedTestUsers() {
  try {
    // Create super admin
    const [superAdmin] = await db.insert(users).values({
      username: 'superadmin',
      password: 'admin123', // In production, this should be hashed
      name: 'Super Admin',
      email: 'admin@venues.com',
      role: 'super_admin'
    }).returning();

    console.log('Created super admin:', superAdmin);

    // Get first venue for the venue manager
    const [firstVenue] = await db.select().from(venues).limit(1);

    if (!firstVenue) {
      console.error('No venues found. Please seed venues first.');
      return;
    }

    // Create venue manager
    const [venueManager] = await db.insert(users).values({
      username: 'venuemanager',
      password: 'venue123', // In production, this should be hashed
      name: 'Venue Manager',
      email: 'manager@venues.com',
      role: 'venue_manager'
    }).returning();

    // Assign venue to manager
    await db.update(users)
      .set({ venueId: firstVenue.id })
      .where(eq(users.id, venueManager.id));

    console.log('Created venue manager:', venueManager);
    console.log(`Assigned venue ${firstVenue.name} (ID: ${firstVenue.id}) to venue manager`);

  } catch (error) {
    console.error('Error seeding test users:', error);
  }
}

seedTestUsers();
