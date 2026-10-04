import { Router, Request, Response } from 'express';
import { processIncomingMessage } from '../services/whatsappService';

// This is a generic shape of the incoming message from your WhatsApp provider.
// It will vary depending on whether you use Twilio, Meta Cloud API, or Baileys.
interface WhatsAppWebhookPayload {
  from: string; // Sender's phone number, e.g., '919876543210'
  body: string; // The message text, e.g., "Amul milk 10, paneer 2"
}

const router = Router();

/**
 * @route POST /api/webhook/whatsapp
 * @description Receives incoming WhatsApp messages from the WhatsApp provider.
 */
router.post('/whatsapp', (req: Request, res: Response) => {
  const payload = req.body as WhatsAppWebhookPayload;

  // 1. Basic validation of the incoming payload.
  if (!payload || !payload.from || !payload.body) {
    console.warn('[WhatsAppBridge] Received invalid webhook payload:', payload);
    return res.status(400).json({ error: 'Invalid payload' });
  }

  // 2. Acknowledge receipt immediately to prevent timeouts and retries from the provider.
  res.status(200).send('OK');

  // 3. Process the message in the background without waiting for it to complete.
  processIncomingMessage(payload.from, payload.body)
    .catch(err => console.error(`[WhatsAppBridge] Unhandled error processing message from ${payload.from}:`, err));
});

export default router;