
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { webhookRoutes } from '../webhooks/webhook-routes.js';
import { db } from '../db.js';

const app = express();
app.use(express.json());
app.use('/api/webhooks', webhookRoutes);

beforeEach(() => {
  // Clear any mocks/data before each test
});

describe('Webhook Routes', () => {
  it('should handle daily sync webhook', async () => {
    const response = await request(app)
      .post('/api/webhooks/daily-sync')
      .send({});
    
    expect(response.status).toBe(200);
  });

  it('should validate Bandsintown webhook signature', async () => {
    const response = await request(app)
      .post('/api/webhooks/bandsintown')
      .set('X-Signature', 'invalid-signature')
      .send({
        event_type: 'event.created',
        data: {}
      });
    
    expect(response.status).toBe(401);
  });
});
