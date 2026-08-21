import { z } from 'zod';

/**
 * The `data` block the backend attaches to the day's push — written by
 * `apps/functions/src/domains/daily-questions/tasks/notifyDailyQuestion.ts`,
 * read here. It travels as JSON through APNs and FCM, so every value is a
 * string.
 *
 * Parsed rather than cast: the payload comes off the network and reaches this
 * code before any screen does, so a push from an older backend — or a
 * malformed one — has to end in "nothing happens", never in a crash on launch.
 */
const dailyQuestionRouteSchema = z.object({
  type: z.literal('daily_question'),
  /** `YYYY-MM-DD`, the day key `DailyQuestion`'s `date` param speaks. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * The day a tapped notification points at, or null when it points at nothing
 * this app knows how to open.
 */
export const parseDailyQuestionRoute = (data: unknown): string | null => {
  const parsed = dailyQuestionRouteSchema.safeParse(data);

  return parsed.success ? parsed.data.date : null;
};
