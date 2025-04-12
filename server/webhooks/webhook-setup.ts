import axios from 'axios';
import { SyncLogger } from '../core/sync-logger';
import { db } from '../db';
import { webhookConfigurations } from '../../shared/schema';

const logger = new SyncLogger('WebhookSetup');

/**
 * Register a webhook with Bandsintown
 * @param callbackUrl The URL to receive webhooks
 * @param apiKey Bandsintown API key
 * @returns Result of the registration
 */
export async function registerBandsintownWebhook(callbackUrl: string, apiKey: string) {
  try {
    logger.log(`Registering webhook at ${callbackUrl} with Bandsintown`, 'info');
    
    // This is a stub - in production, we would call the Bandsintown API
    logger.log('Note: This is a stub implementation due to API rate limits', 'info');
    
    return {
      success: true,
      message: 'Webhook registration is simulated due to API rate limits',
      webhookId: `webhook_${Date.now()}`
    };
  } catch (error) {
    logger.log(`Error registering webhook: ${error}`, 'error');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error registering webhook'
    };
  }
}

/**
 * Unregister a webhook with Bandsintown
 * @param webhookId The ID of the webhook to unregister
 * @param apiKey Bandsintown API key
 * @returns Result of the unregistration
 */
export async function unregisterBandsintownWebhook(webhookId: string, apiKey: string) {
  try {
    logger.log(`Unregistering webhook ${webhookId} with Bandsintown`, 'info');
    
    // This is a stub - in production, we would call the Bandsintown API
    logger.log('Note: This is a stub implementation due to API rate limits', 'info');
    
    return {
      success: true,
      message: 'Webhook unregistration is simulated due to API rate limits'
    };
  } catch (error) {
    logger.log(`Error unregistering webhook: ${error}`, 'error');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error unregistering webhook'
    };
  }
}

/**
 * Verify that a webhook connection is working
 * @param callbackUrl The URL to test
 * @param apiKey Bandsintown API key
 * @returns Result of the test
 */
export async function verifyWebhookConnection(callbackUrl: string, apiKey: string) {
  try {
    logger.log(`Verifying webhook connection at ${callbackUrl}`, 'info');
    
    // Create a test payload
    const testPayload = {
      event_type: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook event' }
    };
    
    // Send a test request
    const response = await axios.post(callbackUrl, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Type': 'test',
        'X-Webhook-Source': 'internal-test'
      },
      timeout: 5000 // 5 second timeout
    });
    
    if (response.status === 200) {
      logger.log('Webhook test succeeded', 'info');
      return {
        success: true,
        message: 'Webhook connection is working correctly'
      };
    } else {
      logger.log(`Webhook test received unexpected status: ${response.status}`, 'warning');
      return {
        success: false,
        message: `Webhook test received unexpected status code: ${response.status}`
      };
    }
  } catch (error) {
    logger.log(`Error testing webhook: ${error}`, 'error');
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: 'Connection refused. Ensure the webhook server is running and accessible.'
        };
      } else if (error.response) {
        return {
          success: false,
          message: `Server responded with status code ${error.response.status}: ${error.response.data?.message || error.message}`
        };
      } else {
        return {
          success: false,
          message: `Network error: ${error.message}`
        };
      }
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error testing webhook'
    };
  }
}

/**
 * Initialize webhook configurations
 * This sets up default webhook configurations in the database
 */
export async function initializeWebhookConfigurations() {
  try {
    logger.log('Initializing webhook configurations', 'info');
    
    // Set up Bandsintown event webhook
    await db.insert(webhookConfigurations).values({
      name: 'Bandsintown Events',
      type: 'bandsintown_events',
      description: 'Receive event updates from Bandsintown',
      callbackUrl: '/api/webhooks/bandsintown',
      isEnabled: false,
      secretKey: '',
      configOptions: JSON.stringify({
        validateSignature: true,
        trackingEvents: ['event.created', 'event.updated', 'event.canceled']
      })
    }).onConflictDoNothing();
    
    // Set up daily sync webhook
    await db.insert(webhookConfigurations).values({
      name: 'Daily Data Sync',
      type: 'scheduled_sync',
      description: 'Automatically syncs venue and artist data daily',
      callbackUrl: '/api/webhooks/daily-sync',
      isEnabled: true,
      secretKey: '',
      configOptions: JSON.stringify({
        schedule: '0 0 * * *' // Run at midnight every day
      })
    }).onConflictDoNothing();
    
    // Set up concert data webhook
    await db.insert(webhookConfigurations).values({
      name: 'Concert Data Webhook',
      type: 'concert_data',
      description: 'Receives concert data from external sources',
      callbackUrl: '/api/webhooks/concert-data',
      isEnabled: true,
      secretKey: `sk_concert_${Math.random().toString(36).substring(2, 15)}`,
      configOptions: JSON.stringify({
        validateSignature: false,
        sendAcknowledgment: true
      })
    }).onConflictDoNothing();
    
    logger.log('Webhook configurations initialized', 'info');
  } catch (error) {
    logger.log(`Error initializing webhook configurations: ${error}`, 'error');
    throw error;
  }
}