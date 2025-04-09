import { Router } from 'express';
import { webhookMiddleware } from './webhook-handler';

const webhookRouter = Router();

// Route for Bandsintown webhooks
webhookRouter.post('/bandsintown', webhookMiddleware());

export default webhookRouter;