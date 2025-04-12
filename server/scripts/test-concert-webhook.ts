/**
 * Test script for the concert data webhook
 * 
 * This script sends a test webhook request to the concert data webhook endpoint
 * to verify that it's working correctly.
 */

import axios from 'axios';
import { ConcertDataWebhookPayload } from '../webhooks/interfaces';

async function testConcertWebhook() {
  // Set the webhook URL - in a real environment, this would be your application's URL
  // For testing locally, we'll use localhost
  const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/concert-data';
  
  // Create test event - use current timestamp to ensure uniqueness
  const timestamp = new Date().toISOString();
  const eventId = `test-event-${Date.now()}`;
  
  // Create a test payload
  const payload: ConcertDataWebhookPayload = {
    event_type: 'event.created',
    data: {
      id: eventId,
      datetime: timestamp,
      title: 'Test Concert Event',
      status: 'confirmed',
      artist: {
        id: 'test-artist-id',
        name: 'Test Artist',
        image_url: 'https://example.com/artists/test-artist.jpg'
      },
      venue: {
        id: 'test-venue-id',
        title: 'Test Venue',
        city: 'Seattle',
        state: 'WA',
        country: 'US',
        lat: 47.6062,
        long: -122.3321,
        address: '123 Test Street',
        postal_code: '98101',
        capacity: 750
      }
    }
  };
  
  console.log('Sending test webhook to:', webhookUrl);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  try {
    // Send the webhook request
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Test': 'true'
      }
    });
    
    console.log('Webhook response status:', response.status);
    console.log('Webhook response data:', response.data);
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error sending webhook:');
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received from server');
      } else {
        console.error('Error:', error.message);
      }
    } else {
      console.error('Error:', error);
    }
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  testConcertWebhook()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}