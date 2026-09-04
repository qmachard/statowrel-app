/**
 * The parrainage of docs/prd.md §4.9 — a domain that registers **no Cloud
 * Function of its own**, like `notifications` and `instagram`.
 *
 * Its payout is an answer handler, and `daily-questions` already owns a trigger
 * on that exact path: a second `onDocumentCreated` there would have been a
 * second Eventarc trigger, a second function and a second invocation on every
 * answer given in the app, to settle something that happens once per account,
 * ever. So the payout is exported as a helper and the existing trigger calls
 * it, the way `users-onUserCreated` calls `friends`' own pair helper — and it
 * sits under `helpers/` rather than `triggers/steps/` because a `triggers/`
 * folder holding no trigger is a folder a reader searches for one in.
 */
export { payReferralReward } from './helpers/payReferralReward';
