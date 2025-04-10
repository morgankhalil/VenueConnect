import { Router } from 'express';
import { webhookMiddleware } from './webhook-handler';
import { runDailySync } from './daily-sync';

const webhookRouter = Router();

// Route for Bandsintown webhooks
webhookRouter.post('/bandsintown', webhookMiddleware());

// Daily sync webhook endpoint
webhookRouter.post('/daily-sync', async (req, res) => {
  try {
    await runDailySync();
    res.json({ status: 'success', message: 'Daily sync completed' });
  } catch (error) {
    console.error('Error in daily sync webhook:', error);
    res.status(500).json({ error: 'Failed to run daily sync' });
  }
});

export default webhookRouter;

// Daily sync webhook endpoint
webhookRouter.post('/daily-sync', async (req, res) => {
  try {
    const { runDailySync } = await import('./daily-sync');
    await runDailySync();
    res.json({ status: 'success', message: 'Daily sync completed' });
  } catch (error) {
    console.error('Error in daily sync webhook:', error);
    res.status(500).json({ error: 'Failed to run daily sync' });
  }
});
