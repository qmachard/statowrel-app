import type { NextFunction, Request, Response } from 'express';
import { logger } from 'firebase-functions/v2';

import { getAuth } from '@/libs/firebase-admin';

const BEARER = /^Bearer (.+)$/;

/**
 * Lets through the same callers `firestore.rules` calls admins — a signed-in
 * account carrying the `admin` custom claim (`isAdmin()` in
 * `packages/firestore-config/firestore.rules`), which is the FireCMS backoffice.
 *
 * The rules are bypassed entirely by the Admin SDK, so an endpoint that writes
 * has to carry its own check: without this, any caller who found the URL would
 * be writing to the shared month index. The two definitions of "admin" are kept
 * deliberately identical, so granting the claim grants both at once.
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = BEARER.exec(req.header('authorization') ?? '')?.[1];

  if (token === undefined) {
    res.status(401).json({ error: 'A Firebase ID token is required.' });

    return;
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);

    if (decoded.admin !== true) {
      res.status(403).json({ error: 'This endpoint is reserved to administrators.' });

      return;
    }

    next();
  } catch (error) {
    // Never echo the reason back: an expired token and a forged one have to
    // look the same from outside.
    logger.warn('Rejected an ID token', { error });
    res.status(401).json({ error: 'A Firebase ID token is required.' });
  }
};
