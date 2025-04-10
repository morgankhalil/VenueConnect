
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { webhookRoutes } from '../webhooks/webhook-routes';
import { validateWebhookSignature, processBandsintownEventWebhook } from '../webhooks/webhook-handler';

// Mock webhook handler functions
jest.mock('../webhooks/webhook-handler', () => ({
  validateWebhookSignature: jest.fn().mockReturnValue(true),
  processBandsintownEventWebhook: jest.fn().mockResolvedValue({ success: true }),
  processVenueUpdateWebhook: jest.fn().mockResolvedValue({ success: true }),
  processDailySyncWebhook: jest.fn().mockResolvedValue({ success: true })
}));

// Cast mocked functions
const mockValidateSignature = validateWebhookSignature as jest.MockedFunction<typeof validateWebhookSignature>;
const mockProcessEventWebhook = processBandsintownEventWebhook as jest.MockedFunction<typeof processBandsintownEventWebhook>;

const app = express();
app.use(express.json());
app.use('/api/webhooks', webhookRoutes);

describe('Webhook Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Daily Sync Webhook', () => {
    it('should handle daily sync webhook successfully', async () => {
      const response = await request(app)
        .post('/api/webhooks/daily-sync')
        .send({
          source: 'automated',
          timestamp: new Date().toISOString()
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Daily sync completed'
      });
    });

    it('should handle sync errors gracefully', async () => {
      mockProcessEventWebhook.mockRejectedValueOnce(new Error('Sync failed'));

      const response = await request(app)
        .post('/api/webhooks/daily-sync')
        .send({});
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Bandsintown Webhook', () => {
    const validPayload = {
      event_type: 'event.created',
      data: {
        id: '123',
        artist: {
          id: 'artist_123',
          name: 'Test Artist',
          url: 'http://test.com',
          image_url: 'http://test.com/image.jpg',
          tracker_count: 5000
        },
        venue: {
          id: 'venue_123',
          name: 'Test Venue',
          city: 'Test City',
          country: 'US',
          latitude: 40.7128,
          longitude: -74.0060
        },
        datetime: '2024-04-10T20:00:00Z',
        offers: [{
          type: 'Tickets',
          url: 'http://tickets.com',
          status: 'available'
        }]
      }
    };

    it('should accept valid webhook with proper signature', async () => {
      const response = await request(app)
        .post('/api/webhooks/bandsintown')
        .set('X-Webhook-Signature', 'valid-signature')
        .send(validPayload);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success' });
    });

    it('should reject webhook with invalid signature', async () => {
      mockValidateSignature.mockReturnValueOnce(false);

      const response = await request(app)
        .post('/api/webhooks/bandsintown')
        .set('X-Webhook-Signature', 'invalid-signature')
        .send(validPayload);
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Invalid webhook signature'
      });
    });

    it('should handle missing signature header', async () => {
      const response = await request(app)
        .post('/api/webhooks/bandsintown')
        .send(validPayload);
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Missing webhook signature'
      });
    });

    it('should validate required payload fields', async () => {
      const invalidPayload = {
        event_type: 'event.created',
        data: {
          id: '123'
          // Missing required fields
        }
      };

      const response = await request(app)
        .post('/api/webhooks/bandsintown')
        .set('X-Webhook-Signature', 'valid-signature')
        .send(invalidPayload);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle event updates', async () => {
      const updatePayload = {
        ...validPayload,
        event_type: 'event.updated'
      };

      const response = await request(app)
        .post('/api/webhooks/bandsintown')
        .set('X-Webhook-Signature', 'valid-signature')
        .send(updatePayload);
      
      expect(response.status).toBe(200);
    });

    it('should handle event cancellations', async () => {
      const cancelPayload = {
        ...validPayload,
        event_type: 'event.canceled'
      };

      const response = await request(app)
        .post('/api/webhooks/bandsintown')
        .set('X-Webhook-Signature', 'valid-signature')
        .send(cancelPayload);
      
      expect(response.status).toBe(200);
    });
  });
});
