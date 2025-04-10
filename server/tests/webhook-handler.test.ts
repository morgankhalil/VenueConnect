
import { describe, it, expect, jest } from '@jest/globals';
import { processBandsintownEventWebhook } from '../webhooks/webhook-handler';

describe('Webhook Handler', () => {
  it('should process a valid Bandsintown event webhook', async () => {
    const mockPayload = {
      event_type: 'event.created',
      data: {
        venue: {
          name: 'Test Venue',
          city: 'New York',
          country: 'US',
          capacity: 500
        },
        artist: {
          name: 'Test Artist',
          genres: ['rock'],
          tracker_count: 1000
        },
        datetime: '2024-04-10T20:00:00',
        offers: [{
          type: 'tickets',
          url: 'http://example.com/tickets',
          status: 'available'
        }]
      }
    };

    await expect(processBandsintownEventWebhook(mockPayload)).resolves.not.toThrow();
  });

  it('should handle missing data gracefully', async () => {
    const mockPayload = {
      event_type: 'event.created',
      data: {
        venue: {
          name: 'Test Venue',
          city: 'New York',
          country: 'US'
        },
        artist: {
          name: 'Test Artist'
        },
        datetime: '2024-04-10T20:00:00'
      }
    };

    await expect(processBandsintownEventWebhook(mockPayload)).resolves.not.toThrow();
  });
});
