import express from 'express';
import { webhookMiddleware } from './webhook-handler';

const webhookRouter = express.Router();

// Middleware for parsing webhook payload
webhookRouter.use(express.json({ limit: '10mb' }));

// Route for Bandsintown webhooks
webhookRouter.post('/bandsintown', webhookMiddleware());

// General webhook route that uses the webhook type from the path
webhookRouter.post('/:type', webhookMiddleware());

// Health check route
webhookRouter.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok' });
});

export default webhookRouter;