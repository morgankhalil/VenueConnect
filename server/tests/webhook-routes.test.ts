
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { webhookRoutes } from '../webhooks/webhook-routes';
import { validateWebhookSignature } from '../webhooks/webhook-handler';

// Mock validateWebhookSignature
jest.mock('../webhooks/webhook-handler', () => ({
  validateWebhookSignature: jest.fn().mockReturnValue(true),
  processBandsintownEventWebhook: jest.fn().mockResolvedValue(undefined)
}));

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
        .send({});
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Daily sync completed'
      });
    });
  });

  describe('Bandsintown Webhook', () => {
    const validPayload = {
      event_type: 'event.created',
      data: {
        id: '123',
        artist: {
          name: 'Test Artist',
          url: 'http://test.com',
          image_url: 'http://test.com/image.jpg'
        },
        venue: {
          name: 'Test Venue',
          city: 'Test City',
          country: 'US',
          latitude: 40.7128,
          longitude: -74.0060
        },
        datetime: '2024-04-10T20:00:00Z'
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
      (validateWebhookSignature as jest.Mock).mockReturnValueOnce(false);

      const response = await request(app)
        .post('/api/webhooks/bandsintown')
        .set('X-Webhook-Signature', 'invalid-signature')
        .send(validPayload);
      
      expect(response.status).toBe(401);
    });

    it('should handle missing signature header', async () => {
      const response = await request(app)
        .post('/api/webhooks/bandsintown')
        .send(validPayload);
      
      expect(response.status).toBe(401);
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
