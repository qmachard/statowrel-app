/**
 * Instagram — the daily recap the account posts every morning.
 *
 * The domain registers **no Cloud Function yet**, which is why it is absent
 * from `src/index.ts`: this half draws the two slides and nothing sends them.
 * `notifications` sits in the same shape for the same reason — a service the
 * rest of the backend goes through, exported as helpers rather than as
 * registrations.
 *
 * The publication itself — the Instagram Graph API, the long-lived token and
 * the two schedulers that use them — lands next, and this file starts
 * exporting `scheduleDailyRecap` when it does.
 *
 * Until then the entry point is `npm run render-instagram-card`, which builds
 * this very code and writes the JPEGs to disk. Being able to *look* at the post
 * before anything can publish it is the point of the split: a card is judged by
 * eye, and no amount of typechecking says whether a six-option day still reads.
 */
export { type DailyRecap, type RecapOption, dailyRecapOf } from './helpers/recapData';

export { renderRecapCarousel } from './helpers/recapCard';
