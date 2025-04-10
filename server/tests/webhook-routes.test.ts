
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { webhookRoutes } from '../webhooks/webhook-routes.js';

const app = express();
app.use(express.json());
app.use('/api/webhooks', webhookRoutes);

describe('Webhook Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle daily sync webhook', async () => {
    const response = await request(app)
      .post('/api/webhooks/daily-sync')
      .send({});
    
    expect(response.status).toBe(200);
  });

  it('should handle Bandsintown webhook with proper signature', async () => {
    const mockData = {
      event_type: 'event.created',
      data: {
        id: '123',
        datetime: '2024-04-10T20:00:00Z',
        venue: {
          name: 'Test Venue',
          city: 'Test City'
        }
      }
    };

    const response = await request(app)
      .post('/api/webhooks/bandsintown')
      .set('X-Signature', 'test-signature')
      .send(mockData);
    
    expect(response.status).toBe(200);
  });
});
