/**
 * Script to add a concert data webhook configuration to the database
 * 
 * Run this script to set up a webhook configuration for receiving concert data
 * from external sources via the webhook API.
 */

import { db } from '../db';
import { webhookConfigurations } from '../../shared/schema';

async function addConcertWebhook() {
  console.log('Adding concert data webhook configuration...');

  try {
    // Check if a concert data webhook already exists
    const existingWebhooks = await db
      .select()
      .from(webhookConfigurations)
      .where(webhook => webhook.type.equals('concert_data'));

    if (existingWebhooks.length > 0) {
      console.log('Concert data webhook already exists.');
      console.log('Existing configuration:', existingWebhooks[0]);
      return;
    }

    // Create a new webhook configuration
    const [newWebhook] = await db
      .insert(webhookConfigurations)
      .values({
        name: 'Concert Data Webhook',
        type: 'concert_data',
        description: 'Receives concert data from external sources to update the database with venues, artists, and events.',
        callbackUrl: `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/webhooks/concert-data`,
        isEnabled: true,
        secretKey: `sk_concert_${Math.random().toString(36).substring(2, 15)}`,
        configOptions: JSON.stringify({
          validateSignature: false,
          sendAcknowledgment: true
        })
      })
      .returning();

    console.log('Successfully added concert data webhook configuration:');
    console.log(newWebhook);
  } catch (error) {
    console.error('Error adding concert data webhook:', error);
  }
}

// Only run the function if this script is executed directly
if (require.main === module) {
  addConcertWebhook()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { addConcertWebhook };