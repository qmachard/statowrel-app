import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

export const USER_COLLECTION = 'v1_users';

/**
 * Firebase Auth provider ids, as they appear in `User.providerData[].providerId`
 * — see docs/prd.md §4.1. `facebook.com` is listed by the PRD but not wired in
 * the app yet; a profile may already carry it once it is.
 */
export const AUTH_PROVIDER_IDS = [ 'password', 'google.com', 'apple.com', 'facebook.com' ] as const;

export type AuthProviderId = (typeof AUTH_PROVIDER_IDS)[number];

export const isAuthProviderId = (value: string): value is AuthProviderId => (
  (AUTH_PROVIDER_IDS as readonly string[]).includes(value)
);

/**
 * Profile, answering stats and wallet of an app user — see docs/prd.md §2 and §6.
 *
 * The document id is the Firebase Auth UID, not a ULID: it is the key every
 * other collection points at (`author_id`, `user_id`, friendships) and the one
 * `firestore.rules` compares against `request.auth.uid`. The document is
 * written by the app itself, once the pseudo has been chosen on the onboarding
 * screen (`src/auth/profile.ts`).
 *
 * Profile, sign-in identities, answering stats and the StatCoin wallet. The PRD's
 * `invite_code` is still to be modelled, and so is its `photo_url` the day a
 * real profile-photo system ships — today every face is generated from the handle
 * (`apps/app/src/lib/avatars.ts`), and the Menu screen's own avatar reads the
 * provider picture straight off Firebase Auth, so Firestore carries no photo.
 */
export interface UserFirebaseData {
  /**
   * Handle, unique across the app, typed by the user on the onboarding sheet —
   * never pre-filled from a provider. Lowercase, `USERNAME_PATTERN`-shaped, and
   * mirrored by a `v1_usernames/{username}` document, which is what makes it
   * unique and what resolves it back to this account (docs/prd.md §4.1).
   */
  username: string;
  /**
   * Account email, mirrored from Firebase Auth. Null when no provider gives one
   * (Apple's private relay can be hidden, and the field is not the source of
   * truth — Firebase Auth is).
   */
  email: string | null;
  /**
   * Every provider linked to the account, mirrored from Auth at each sign-in.
   * A single account can carry several once identities are linked (PRD §4.1).
   */
  auth_providers: AuthProviderId[];
  created_at: UniversalTimestamp;
  /** Bumped on every profile write, so a stale client can tell it needs to refetch. */
  updated_at: UniversalTimestamp;
  /**
   * Consecutive days answered on time, shown on the Stats screen (docs/prd.md §5.2).
   *
   * Maintained by the backend, never by the app: the answer trigger bumps it,
   * the midnight scheduler resets it to 0 for whoever did not answer. A
   * catch-up answer completes the calendar but leaves this alone — the streak
   * rewards regularity, the card rewards the collection (docs/prd.md §4.6).
   */
  streak_count: number;
  /** Longest `streak_count` ever reached, shown next to the current one on the Profile screen (docs/prd.md §5.3). */
  streak_best: number;
  /**
   * Total days answered since sign-up, shown as its own tile on the Stats
   * screen (docs/prd.md §5.2). Catch-up answers count — the tile rewards the
   * collection, not the regularity.
   *
   * Stored rather than counted at display time: the calendar only ever loads
   * one month, so there is nothing client-side left to count. Maintained by
   * the answer trigger, like the streak.
   */
  answers_count: number;
  /** `YYYY-MM-DD` of the last on-time answer, the value `streak_count` is computed against. Null until the first one. */
  streak_last_answered_on: string | null;
  /**
   * The wallet — what the account can spend right now (docs/prd.md §4.7).
   *
   * Credited `STREAK_STATCOIN_REWARD` every `STREAK_STATCOIN_MILESTONE` consecutive
   * days answered on time, debited `QUESTION_STATCOIN_COST` by proposing a
   * question. Both moves belong to the backend, like the streak above and for
   * the same reason: an update that changes this from a client is a forged
   * balance, and `firestore.rules` refuses it.
   *
   * The app seeds it at 0 on a genuinely new profile and never touches it
   * again — a create that seeds anything else is refused too, because a forged
   * opening balance is a free question.
   */
  statcoin_balance: number;
  /**
   * Lifetime StatCoins credited to the account, and lifetime StatCoins debited
   * from it. Not derivable from each other and from the balance the day they
   * come from anywhere but a streak — a bought pack, a watched ad, a gift — so
   * both are stored rather than one inferred.
   *
   * Nothing reads them yet. They are the trace a currency has to keep from its
   * first day: a balance alone cannot say how it got there, and the answer is
   * not reconstructible after the fact.
   */
  statcoins_earned: number;
  statcoins_spent: number;
}

export type UserData = ModelData<UserFirebaseData>;

const parseAuthProviders = (providers: unknown): AuthProviderId[] => (
  Array.isArray(providers) ? providers.filter((provider): provider is AuthProviderId => (
    typeof provider === 'string' && isAuthProviderId(provider)
  )) : []
);

export const userConverter: FirestoreConverter<UserData, UserFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    username: data.username,
    email: data.email ?? null,
    auth_providers: data.auth_providers ?? [],
    created_at: TimestampClass.fromDate(new Date(data.created_at)),
    updated_at: TimestampClass.fromDate(new Date(data.updated_at)),
    streak_count: data.streak_count,
    streak_best: data.streak_best,
    answers_count: data.answers_count,
    streak_last_answered_on: data.streak_last_answered_on ?? null,
    statcoin_balance: data.statcoin_balance,
    statcoins_earned: data.statcoins_earned,
    statcoins_spent: data.statcoins_spent,
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      username: data.username ?? '',
      email: data.email ?? null,
      auth_providers: parseAuthProviders(data.auth_providers),
      created_at: parseTimestamp(data.created_at ?? null, 'now'),
      updated_at: parseTimestamp(data.updated_at ?? null, 'now'),
      streak_count: data.streak_count ?? 0,
      streak_best: data.streak_best ?? 0,
      answers_count: data.answers_count ?? 0,
      streak_last_answered_on: data.streak_last_answered_on ?? null,
      // The wallet is younger than the collection, so every profile written
      // before it carries none — an empty wallet, not a missing one.
      statcoin_balance: data.statcoin_balance ?? 0,
      statcoins_earned: data.statcoins_earned ?? 0,
      statcoins_spent: data.statcoins_spent ?? 0,
    };
  },
});
