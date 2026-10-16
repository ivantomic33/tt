import { Router, Request, Response } from 'express';
import { getAdminSupabaseClient } from '../db/supabaseClient';
import { sensitiveAuthRateLimiter } from '../security/rateLimiter';

/**
 * NEWSLETTER API
 *
 * Javna prijava pretplatnika ide preko servera (service_role) uz strogi rate limit,
 * umesto direktnog anon INSERT-a u `newsletter_subscribers` (koji je bio spam vektor).
 * Odgovarajuća RLS politika je uklonjena (vidi schema.sql i migracije).
 */

const router = Router();

// Jednostavna, stroga validacija email formata (dodatna odbrana iznad RLS-a).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', sensitiveAuthRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (!email || email.length > 100 || !EMAIL_RE.test(email)) {
      res.status(400).json({ success: false, error: 'Neispravna email adresa.' });
      return;
    }

    const client = getAdminSupabaseClient();
    const { error } = await client
      .from('newsletter_subscribers')
      .insert({ email, active: true, subscribed_at: new Date().toISOString() });

    if (error) {
      // 23505 = unique violation → adresa je već prijavljena (tretiramo kao uspeh, bez enumeracije).
      if (error.code === '23505') {
        res.status(200).json({
          success: true,
          message: 'Ova email adresa je već prijavljena na newsletter.',
        });
        return;
      }
      console.error('[newsletterRouter.subscribe]', error);
      res.status(400).json({ success: false, error: 'Greška pri prijavi na newsletter.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Uspešno ste se prijavili na gaming newsletter!' });
  } catch (err) {
    console.error('[newsletterRouter.subscribe]', err);
    res.status(500).json({ success: false, error: 'Greška na serveru.' });
  }
});

export default router;
