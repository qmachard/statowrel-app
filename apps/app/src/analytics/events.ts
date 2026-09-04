/**
 * The tagging plan, in one typed union — see `docs/analytics.md`.
 *
 * Every event the app sends goes through `track({ name, params })`, and the
 * only names it accepts are the ones declared here. Adding an event means
 * adding a variant to `AnalyticsEvent` and a row in `docs/analytics.md` — the
 * two are read together, so a diff that touches one and not the other is the
 * signal for review.
 *
 * **Naming**: `snake_case`, past tense (« _completed », « _submitted »), verb
 * describing the *user's* action rather than the system's reaction. GA4 caps
 * event names at 40 characters and parameter names at 40 too — the shape below
 * stays well under both.
 *
 * **No PII**: parameters carry ids and enums, never handles, emails, or free
 * text an answer might hold. The user's UID is a *user id* (`setUserId`), not
 * a parameter.
 */
export type AnalyticsEvent =
  | { name: 'sign_up_completed'; params: { method: SignInMethod } }
  | { name: 'sign_in_completed'; params: { method: SignInMethod } }
  | { name: 'sign_out'; params?: Record<string, never> }
  | { name: 'answer_submitted'; params: { question_id: string; option_id: string; late: boolean } }
  | { name: 'joker_used'; params: { question_id: string } }
  | { name: 'question_proposed'; params: { options_count: number } }
  | { name: 'friend_invited'; params: { outcome: FriendInviteOutcome } }
  | { name: 'friend_invitation_accepted'; params?: Record<string, never> };

/** The three doors of `src/auth/providers.ts`. `password` covers both sign-in and sign-up with e-mail. */
export type SignInMethod = 'google' | 'apple' | 'password';

/**
 * `sent` — the callable accepted the invitation.
 * `not_found` — the handle resolved to nobody (client-side shortcut or callable's `not-found`).
 * `already_friends` / `pending` / `blocked` / `error` — reserved for future refinements; today
 * everything but `sent` and `not_found` is bucketed as `error` at the call site.
 */
export type FriendInviteOutcome = 'sent' | 'not_found' | 'already_friends' | 'pending' | 'blocked' | 'error';

/** Every user property the app sets, in one place — same rules as event names. */
export interface AnalyticsUserProperties {
  /** `authenticated` once a session exists, absent otherwise. Nothing PII. */
  session_state?: 'anonymous' | 'authenticated';
  /**
   * A coarse bucket over the current streak — `0`, `1-6`, `7-29`, `30+`. Kept
   * as a bucket rather than the raw number so the GA property stays low
   * cardinality (GA4 caps at 25 unique values per user property).
   */
  streak_bucket?: '0' | '1-6' | '7-29' | '30+';
}

/** Coarse bucket for `streak_bucket` — see `AnalyticsUserProperties`. */
export const streakBucketOf = (streak: number): AnalyticsUserProperties['streak_bucket'] => {
  if (streak >= 30) return '30+';
  if (streak >= 7) return '7-29';
  if (streak >= 1) return '1-6';

  return '0';
};
