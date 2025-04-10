
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { processBandsintownEventWebhook } from '../webhooks/webhook-handler';
import { SyncLogger } from '../core/sync-logger';

jest.mock('../core/sync-logger');

describe('Webhook Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process a valid Bandsintown event webhook', async () => {
    const mockPayload = {
      event_type: 'event.created',
      data: {
        artist: { name: 'Test Artist' },
        venue: { name: 'Test Venue' },
        datetime: '2024-04-10T20:00:00Z'
      }
    };

    await expect(processBandsintownEventWebhook(mockPayload)).resolves.not.toThrow();
  });

  it('should handle missing data gracefully', async () => {
    const mockPayload = {
      event_type: 'event.created',
      data: {}
    };

    await expect(processBandsintownEventWebhook(mockPayload)).resolves.not.toThrow();
  });
});
