import {
  type FirestoreConverter,
  type ModelData,
  type UniversalTimestamp,
  parseTimestamp,
  removeMissingFields,
} from './commons';

export const QUESTION_COLLECTION = 'v1_questions';

/** A question carries between 2 and 6 options — see docs/prd.md §4.2. */
export const QUESTION_MIN_OPTIONS = 2;
export const QUESTION_MAX_OPTIONS = 6;

/**
 * Moderation lifecycle (docs/prd.md §4.7): a user proposes a question
 * (`pending`), a moderator approves or rejects it, and it becomes `used` once
 * it has been drawn as a daily question. A used question is never redrawn.
 *
 * `demo` sits outside that lifecycle: it is the sample question the onboarding
 * carousel poses to someone who has not signed up yet. It is never moderated,
 * never drawn — the daily draw reads the `approved` pot alone — and it is the
 * one status `firestore.rules` lets an anonymous visitor read, because the
 * carousel runs before there is a session to check.
 */
export const QUESTION_STATUSES = [ 'pending', 'approved', 'rejected', 'used', 'demo' ] as const;

export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

/**
 * The one question the onboarding carousel poses — a fixed document id rather
 * than a query, so the app reads a single document and `firestore.rules` can
 * open it up by status alone.
 *
 * Written by `npm run seed-demo-question`, which is also what carries the
 * tally the sample StatOwrel is computed from: a demo question does take
 * answers — the pick made in the carousel is written at the first sign-in —
 * but it starts with none, and an empty `answer_counts` would put the first
 * visitors at « 100% des gens ».
 */
export const DEMO_QUESTION_ID = '01M0HNM3RQMP2TDXPTW6ZSSM17';

export interface QuestionOptionFirebaseData {
  /**
   * ULID, minted client-side (app or backoffice) when the option is typed in.
   * An answer and `answer_counts` below both point at it, so it is never
   * reused and never changes — reordering or reformulating an option must not
   * repoint recorded answers.
   */
  id: string;
  /** Option shown to the user — e.g. "Par le bout". */
  label: string;
  /** StatOwrel earned by picking this option — e.g. "méthodique", rendered as "tu es un.e méthodique". */
  stat_label: string;
}

/**
 * A question, from the moderation pot to the day it ran — see docs/prd.md §6.
 *
 * There is no separate per-day document: once a question is drawn it *is* the
 * day, and carries everything the day used to — when it dropped
 * (`broadcast_at`), which Paris day that was (`broadcast_on`), when it closes
 * (`closes_at`), the tally of what people picked (`answer_counts`) — with the
 * answers themselves as its sub-collection. `v1_daily_question_months` is what
 * points a calendar day at the question that ran it.
 */
export interface QuestionFirebaseData {
  /** Question text — e.g. "Ton dentifrice, tu le presses…". */
  label: string;
  /**
   * Options in display order — the array order is the order every user sees,
   * which is what makes screenshots comparable between friends.
   * Between QUESTION_MIN_OPTIONS and QUESTION_MAX_OPTIONS entries.
   */
  options: QuestionOptionFirebaseData[];
  status: QuestionStatus;
  /** Author of the question, credited on the question screen once it is drawn. */
  author_id: string;
  /**
   * The author's `username`, copied from their profile when the question is
   * written, so the credit line of docs/prd.md §5.4 costs nothing: the day
   * screen already holds the question, and the moderation console already
   * streams the whole pot. Without it, naming an author is one profile read per
   * opening of a day and one per distinct author of a pot that never shrinks.
   *
   * Same trade, and the same reasoning, as `friend_username` on
   * `v1_user_friend`: a display cache, not the truth —
   * `v1_users/{author_id}.username` stays it, and `v1_usernames` stays what
   * makes it unique. It is safe to copy because it is *checkable*:
   * `firestore.rules` runs the same `get()` on the reservation that the
   * friendship's own `friendUsernameIsTheirs()` runs, so a client cannot drop a
   * question credited under somebody else's handle.
   *
   * Nullable, and not only for a question nobody proposed (a seeded catalogue
   * entry, the onboarding demo): the field is younger than the collection, so
   * every question written before it carries none. A null one falls back to
   * reading the profile — the same shape as `questionLastModifiedAt` falling
   * back to `created_at` — until `npm run backfill-question-authors` has run.
   *
   * **The credit follows a rename.** Renaming a handle does not exist yet
   * (docs/prd.md §4.1) and cannot be a client write — `v1_usernames` is
   * `allow update, delete: if false`, freeing a reservation being the backend's
   * job. The day that job exists, it owns propagating this copy onto its
   * author's questions, alongside the `v1_user_friends` copies: the alternative
   * is showing two different handles for one person in the same app, which is
   * worse than a fan-out over the handful of documents §4.7 lets anybody
   * propose.
   */
  author_username: string | null;
  /** Reason sent back to the author. Null unless `status` is `rejected`. */
  rejection_reason: string | null;
  /**
   * Instant the question is broadcast as the daily question — the day it was
   * drawn, at the 07:00 Paris drop time. Null until the question is drawn.
   */
  broadcast_at: UniversalTimestamp | null;
  /**
   * `YYYY-MM-DD` Paris day the question was broadcast on. Null until it is drawn.
   *
   * The day key `broadcast_at` falls on, carried as its own field because a
   * timestamp cannot be turned into a Paris day key by anything that reads this
   * document without a clock and a timezone database — `firestore.rules` in
   * particular, which pins an answer's `date` to this value so a forged one
   * cannot land on the wrong day of the calendar or of the streak.
   *
   * It is also the reverse of `v1_daily_question_months.days.{DD}.question_id`:
   * the month says which question ran a day, this says which day a question ran.
   */
  broadcast_on: string | null;
  /**
   * Paris midnight closing the broadcast day. Past it, an answer no longer
   * counts for the streak and is flagged `late` (docs/prd.md §4.6). Null until
   * the question is drawn.
   *
   * Stored rather than derived from `broadcast_on` so `firestore.rules` can
   * check the `late` flag against it — and so the app decides the flag against
   * the exact value the rules will check it against.
   */
  closes_at: UniversalTimestamp | null;
  /**
   * Total answers per option, keyed by `QuestionOptionFirebaseData.id`.
   *
   * A map rather than an array so the answer trigger increments
   * `answer_counts.{option_id}` — a fixed path — with `FieldValue.increment(1)`:
   * two simultaneous answers can't overwrite each other. An option with no
   * answer yet is simply absent, not `0`.
   *
   * The card's rarity (docs/prd.md §5.5) is the picked option's share of the
   * sum of this map, recomputed at display time: it keeps moving while answers
   * come in and settles at close.
   */
  answer_counts: Record<string, number>;
  created_at: UniversalTimestamp;
  /**
   * Last time a moderator changed the question — its wording, its options or
   * its status — and the instant the daily scheduler stamped the broadcast on
   * it. Not touched by the answer trigger: an incoming answer moves
   * `answer_counts`, not the question itself, and stamping it there would make
   * every drawn question look freshly edited all day long.
   *
   * Nullable because the field is younger than the pot: a question written
   * before it existed carries none, and the backoffice falls back to
   * `created_at` (see `questionLastModifiedAt`).
   */
  updated_at: UniversalTimestamp | null;
}

export type QuestionOptionData = ModelData<QuestionOptionFirebaseData>;

export type QuestionData = ModelData<QuestionFirebaseData>;

/**
 * When a question was last touched, for the backoffice's « Dernière
 * modification » column and its sort.
 *
 * Falls back to `created_at` rather than to nothing: `updated_at` is younger
 * than the collection, so a question nobody has edited since it was written
 * has none, and an empty cell would read as missing data instead of « jamais
 * modifiée ».
 */
export const questionLastModifiedAt = (question: Pick<QuestionData, 'created_at' | 'updated_at'>): string => (
  question.updated_at ?? question.created_at
);

/** Resolves the option an answer points at. Returns `null` for an option removed since. */
export const findQuestionOption = (
  options: QuestionOptionData[] | null | undefined,
  optionId: string,
): QuestionOptionData | null => (
  options?.find((option) => option.id === optionId) ?? null
);

const parseAnswerCounts = (
  counts: Record<string, number> | null | undefined,
): Record<string, number> => (
  // Built by reduce, not by indexing: `noUncheckedIndexedAccess` is on in this package.
  Object.entries(counts ?? {}).reduce<Record<string, number>>((acc, [ optionId, total ]) => {
    if (typeof total === 'number') {
      acc[optionId] = total;
    }

    return acc;
  }, {})
);

const parseOptions = (
  options: Partial<QuestionOptionFirebaseData>[] | null | undefined,
): QuestionOptionData[] => (
  (options ?? []).map((option) => ({
    id: option?.id ?? '',
    label: option?.label ?? '',
    stat_label: option?.stat_label ?? '',
  }))
);

export const questionConverter: FirestoreConverter<QuestionData, QuestionFirebaseData> = (TimestampClass) => ({
  toFirestore: (data) => removeMissingFields({
    label: data.label,
    options: (data.options ?? []).map((option) => ({
      id: option.id,
      label: option.label,
      stat_label: option.stat_label,
    })),
    status: data.status,
    author_id: data.author_id,
    author_username: data.author_username ?? null,
    rejection_reason: data.rejection_reason ?? null,
    broadcast_at: data.broadcast_at ? TimestampClass.fromDate(new Date(data.broadcast_at)) : null,
    broadcast_on: data.broadcast_on ?? null,
    closes_at: data.closes_at ? TimestampClass.fromDate(new Date(data.closes_at)) : null,
    answer_counts: parseAnswerCounts(data.answer_counts),
    created_at: TimestampClass.fromDate(new Date(data.created_at)),
    updated_at: data.updated_at ? TimestampClass.fromDate(new Date(data.updated_at)) : null,
  }),
  fromFirestore: (snap) => {
    const data = snap.data();

    return {
      label: data.label ?? '',
      options: parseOptions(data.options),
      status: data.status ?? 'pending',
      author_id: data.author_id ?? '',
      author_username: data.author_username ?? null,
      rejection_reason: data.rejection_reason ?? null,
      broadcast_at: parseTimestamp(data.broadcast_at ?? null),
      broadcast_on: data.broadcast_on ?? null,
      closes_at: parseTimestamp(data.closes_at ?? null),
      answer_counts: parseAnswerCounts(data.answer_counts),
      created_at: parseTimestamp(data.created_at ?? null, 'now'),
      updated_at: parseTimestamp(data.updated_at ?? null),
    };
  },
});
