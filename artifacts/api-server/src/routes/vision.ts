/**
 * POST /vision/analyze
 *
 * Permanently disabled as part of the PepScan shutdown. Keeping the endpoint
 * with an explicit 410 response prevents older installed app versions from
 * reaching an AI provider or receiving a scan verdict.
 */

import { Router } from 'express';

const router = Router();

router.post('/analyze', (_req, res) => {
  res.status(410).json({
    success: false,
    error: 'Scanning has been switched off. Pepscan is closing on 15 October 2026.',
  });
});

export default router;