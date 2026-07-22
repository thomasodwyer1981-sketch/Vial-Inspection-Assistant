import { Router } from 'express';
import { whopFetch } from '../lib/whopProxy';
import { logger } from '../lib/logger';

const router = Router();

interface CheckoutConfigResponse {
  purchase_url?: string;
  id?: string;
  error?: unknown;
}

interface MembershipResponse {
  valid?: boolean;
  product?: { id: string };
  error?: unknown;
}

/**
 * POST /api/whop/checkout
 * Creates a Whop checkout configuration and returns the hosted purchase URL.
 * Body: { redirectUrl: string }
 */
router.post('/checkout', async (req, res) => {
  try {
    const { redirectUrl } = req.body as { redirectUrl?: string };

    if (!redirectUrl || typeof redirectUrl !== 'string') {
      return res.status(400).json({ error: 'redirectUrl is required' });
    }

    const planId = process.env['WHOP_PLAN_ID'];
    if (!planId) {
      logger.error('WHOP_PLAN_ID env var not set');
      return res.status(500).json({ error: 'Payment not configured' });
    }

    const config = (await whopFetch('POST', '/api/v1/checkout_configurations', {
      plan_id: planId,
      redirect_url: redirectUrl,
    })) as CheckoutConfigResponse;

    if (!config.purchase_url) {
      logger.error({ config }, 'Whop checkout config missing purchase_url');
      return res.status(502).json({ error: 'Could not create checkout' });
    }

    return res.json({ purchaseUrl: config.purchase_url });
  } catch (err) {
    logger.error({ err }, 'Whop checkout error');
    return res.status(502).json({ error: 'Checkout unavailable' });
  }
});

/**
 * POST /api/whop/verify
 * Verifies that a membership ID is active and belongs to this product.
 * Body: { membershipId: string }
 * Returns: { verified: boolean }
 */
router.post('/verify', async (req, res) => {
  try {
    const { membershipId } = req.body as { membershipId?: string };

    if (
      !membershipId ||
      typeof membershipId !== 'string' ||
      !membershipId.startsWith('mem_')
    ) {
      return res.status(400).json({ verified: false, error: 'Invalid membershipId' });
    }

    const productId = process.env['WHOP_PRODUCT_ID'];
    if (!productId) {
      logger.error('WHOP_PRODUCT_ID env var not set');
      return res.status(500).json({ verified: false, error: 'Not configured' });
    }

    const membership = (await whopFetch(
      'GET',
      `/api/v1/memberships/${membershipId}`,
    )) as MembershipResponse;

    const verified =
      membership.valid === true && membership.product?.id === productId;

    return res.json({ verified });
  } catch (err) {
    logger.error({ err }, 'Whop verify error');
    // Don't crash the app — return unverified so user can retry
    return res.status(200).json({ verified: false, error: 'Verification unavailable' });
  }
});

/**
 * POST /api/whop/resolve-receipt
 * Resolves a Whop receipt/payment ID (pay_xxx) into a membership ID (mem_xxx).
 * Whop redirects after one-time purchase with receipt_id/payment_id rather than
 * membership_id, so we need this lookup to activate Pro automatically.
 * Body: { receiptId: string }
 * Returns: { membershipId: string | null }
 */
router.post('/resolve-receipt', async (req, res) => {
  try {
    const { receiptId } = req.body as { receiptId?: string };

    if (!receiptId || typeof receiptId !== 'string') {
      return res.status(400).json({ membershipId: null, error: 'receiptId is required' });
    }

    // Whop v2 receipts endpoint returns receipt object with membership_id
    const receipt = (await whopFetch('GET', `/v2/receipts/${receiptId}`)) as {
      membership_id?: string;
      [key: string]: unknown;
    };

    const membershipId = receipt.membership_id ?? null;
    logger.info({ receiptId, membershipId }, 'Whop receipt resolved');
    return res.json({ membershipId });
  } catch (err) {
    logger.error({ err }, 'Whop resolve-receipt error');
    // Return null gracefully — frontend will show manual recovery UI
    return res.json({ membershipId: null });
  }
});

export default router;
