
import { Router } from 'express';
import { runDocumentationAutomation } from '../utils/doc-automation';

const router = Router();

router.get('/scan', async (req, res) => {
  try {
    const result = await runDocumentationAutomation();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to run documentation scan' });
  }
});

export default router;
