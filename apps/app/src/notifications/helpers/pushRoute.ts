import { z } from 'zod';

/**
 * The `data` block the backend attaches to a push — written by
 * `apps/functions/src/domains/daily-questions/tasks/notifyDailyQuestion.ts` and
 * `apps/functions/src/domains/friends/triggers/steps/onFriendshipCreated.ts`
 * and `apps/functions/src/domains/referrals/triggers/steps/payReferralReward.ts`
 * and `apps/functions/src/domains/questions/triggers/steps/onQuestionModerated.ts`,
 * read here. It travels as JSON through APNs and FCM, so every value is a
 * string.
 *
 * Parsed rather than cast: the payload comes off the network and reaches this
 * code before any screen does, so a push from an older backend — or a
 * malformed one — has to end in "nothing happens", never in a crash on launch.
 */
const pushRouteSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('daily_question'),
    /** `YYYY-MM-DD`, the day key `DailyQuestion`'s `date` param speaks. */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  // An invitation carries nothing to route on: the Menu screen lists it, and
  // the list is a live snapshot of `v1_user_friends` (docs/prd.md §5.3).
  z.object({ type: z.literal('friend_invite') }),
  // A settled referral carries nothing to route on either: the push says the
  // whole thing — who arrived, what it paid (docs/prd.md §4.9) — and the wallet
  // it moved is on the Stats screen the Menu opens from.
  z.object({ type: z.literal('referral_joined') }),
  // A moderation verdict carries nothing to route on either — the question's
  // own row says its status and its reason (docs/prd.md §4.7), and the list is
  // a live snapshot. What it does need is the *tab*: the Menu opens on « Mes
  // potes » by default, and landing there after being told about a question
  // would leave the reader to find the switch themselves.
  z.object({ type: z.literal('my_questions') }),
]);

export type PushRoute = z.infer<typeof pushRouteSchema>;

/**
 * The screen a tapped notification points at, or null when it points at
 * nothing this app knows how to open.
 */
export const parsePushRoute = (data: unknown): PushRoute | null => {
  const parsed = pushRouteSchema.safeParse(data);

  return parsed.success ? parsed.data : null;
};
