import { Router, Request, Response } from 'express';
import { webhookMiddleware } from './webhook-handler';
import { runDailySync } from './daily-sync';
import { processConcertDataWebhook } from './concert-data-handler';
import { ConcertDataWebhookPayload } from './interfaces';
import { SyncLogger } from '../core/sync-logger';

const webhookRouter = Router();
const logger = new SyncLogger('WebhookRoutes');

// Route for Bandsintown webhooks
webhookRouter.post('/bandsintown', webhookMiddleware());

// Route for concert data webhook
webhookRouter.post('/concert-data', async (req: Request, res: Response) => {
  try {
    logger.log('Received concert data webhook', 'info');
    
    // Validate the payload
    const payload = req.body as ConcertDataWebhookPayload;
    if (!payload.event_type || !payload.data) {
      logger.log('Invalid payload structure', 'error');
      return res.status(400).json({ 
        error: 'Invalid payload',
        message: 'The webhook payload must include event_type and data fields'
      });
    }
    
    // Process the webhook
    await processConcertDataWebhook(payload);
    
    // Return success
    res.status(200).json({ 
      status: 'success',
      message: `Successfully processed ${payload.event_type} event`
    });
  } catch (error) {
    logger.log(`Error processing concert data webhook: ${error}`, 'error');
    console.error('Error processing concert data webhook:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to process webhook'
    });
  }
});

// Daily sync webhook endpoint
webhookRouter.post('/daily-sync', async (req: Request, res: Response) => {
  try {
    logger.log('Running daily sync from webhook', 'info');
    await runDailySync();
    res.json({ status: 'success', message: 'Daily sync completed' });
  } catch (error) {
    logger.log(`Error in daily sync webhook: ${error}`, 'error');
    console.error('Error in daily sync webhook:', error);
    res.status(500).json({ error: 'Failed to run daily sync' });
  }
});

export default webhookRouter;
