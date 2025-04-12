import axios from 'axios';
import { ConcertDataWebhookPayload } from './interfaces';
import { SyncLogger } from '../core/sync-logger';

const logger = new SyncLogger('WebhookTester');

/**
 * Test the concert data webhook endpoint
 * @param callbackUrl The webhook URL to test
 * @returns Result of the test
 */
export async function testConcertDataWebhook(callbackUrl: string): Promise<{ success: boolean; message: string }> {
  try {
    logger.log(`Testing webhook at ${callbackUrl}`, 'info');

    // Create a sample event payload for the test
    const testPayload: ConcertDataWebhookPayload = {
      event_type: 'event.created',
      data: {
        id: `test-event-${Date.now()}`,
        datetime: new Date().toISOString(),
        title: 'Test Concert Event',
        status: 'confirmed',
        artist: {
          id: 'test-artist-id',
          name: 'Test Artist',
          image_url: 'https://example.com/test-artist.jpg'
        },
        venue: {
          id: 'test-venue-id',
          title: 'Test Venue',
          city: 'Test City',
          state: 'Test State',
          country: 'US',
          lat: 40.7128,
          long: -74.006,
          address: '123 Test Street',
          postal_code: '10001',
          capacity: 500
        }
      }
    };

    // Send the test webhook
    const response = await axios.post(callbackUrl, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Test': 'true'
      },
      timeout: 10000 // 10 second timeout
    });

    if (response.status === 200) {
      logger.log('Webhook test succeeded', 'info');
      return {
        success: true,
        message: 'Webhook test sent successfully, and the server processed it correctly.'
      };
    } else {
      logger.log(`Webhook test received unexpected status: ${response.status}`, 'warning');
      return {
        success: false,
        message: `Webhook test received unexpected status code: ${response.status}`
      };
    }
  } catch (error) {
    logger.log(`Webhook test failed: ${error}`, 'error');
    if (axios.isAxiosError(error)) {
      // Handle connection/network errors
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: 'Connection refused. Ensure the webhook server is running and accessible.'
        };
      } else if (error.response) {
        // The server responded with a non-2xx status code
        return {
          success: false,
          message: `Server responded with status code ${error.response.status}: ${error.response.data?.message || error.message}`
        };
      } else {
        // Other Axios errors
        return {
          success: false,
          message: `Network error: ${error.message}`
        };
      }
    }
    
    // Generic error
    return {
      success: false,
      message: `Failed to test webhook: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}