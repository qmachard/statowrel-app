import type { Request, Response } from 'express';
import { logger } from 'firebase-functions/v2';
import { DAILY_QUESTION_COLLECTION, dailyQuestionConverter } from '@statowrel/models';
import { z } from 'zod';

import { getCollectionRef } from '@/libs/firebase-admin';

import { indexDailyQuestion } from '../../helpers/monthIndex';

/** `YYYY-MM-DD`, the day key that is also a daily question's document id. */
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD day key.');

const bodySchema = z.object({
  /** Inclusive lower bound. Omitted, the scan starts at the first day ever drawn. */
  from: dateKey.optional(),
  /** Inclusive upper bound. Omitted, the scan runs to the last day ever drawn. */
  to: dateKey.optional(),
});

/**
 * Replays already-drawn days into `v1_daily_question_months` — the repair path
 * the month index never had.
 *
 * Every day the scheduler draws is indexed in the batch that creates it, and
 * `scheduleDailyQuestion` now re-checks the day it reuses. Neither covers the
 * days drawn *before* the index existed: they are complete in
 * `v1_daily_questions`, and invisible to the Stats banner and the calendar,
 * which read the index alone. This walks them and writes the entries they are
 * missing.
 *
 * Idempotent and cheap to re-run: `indexDailyQuestion` reads the month first
 * and writes nothing for a day already there, so a second call over the same
 * range reports zero indexed.
 *
 * Days are handled one at a time rather than in a batch. The whole point is to
 * survive a broken day — a question that no longer exists — by logging it and
 * carrying on, where a batch would take the good days down with it.
 */
export const handleReindexMonths = async (req: Request, res: Response): Promise<void> => {
  const body = bodySchema.safeParse(req.body ?? {});

  if (!body.success) {
    res.status(400).json({ error: 'Invalid range.', issues: body.error.issues });

    return;
  }

  const { from, to } = body.data;

  let query = getCollectionRef(DAILY_QUESTION_COLLECTION, dailyQuestionConverter).orderBy('date');

  if (from !== undefined) {
    query = query.where('date', '>=', from);
  }

  if (to !== undefined) {
    query = query.where('date', '<=', to);
  }

  const snapshot = await query.get();
  const indexed: string[] = [];

  for (const document of snapshot.docs) {
    if (await indexDailyQuestion(document.data())) {
      indexed.push(document.id);
    }
  }

  logger.info('Reindexed the daily question months', { from, to, scanned: snapshot.size, indexed: indexed.length });

  res.status(200).json({ scanned: snapshot.size, indexed });
};
