import AsyncStorage from '@react-native-async-storage/async-storage';
import { monthDayKeyOf, monthKeyOf } from '@statowrel/models';

import { readCalendarMonth } from '@/stats/data/calendarCache';

/**
 * How many friends' answers this device has already shown, per day — the other
 * half of the calendar badge of docs/prd.md §5.2.
 *
 * `v1_user_calendar_months.friend_answer_counts` says how many accepted friends
 * have answered a day; this says how many of them one had seen the last time
 * that day was opened. A day is badged while the first is above the second, and
 * opening it puts the two level again.
 *
 * **Local, and deliberately so.** « Déjà vu » is a property of a screen someone
 * looked at, not of the account: it has no reader but this app run, nothing else
 * derives from it, and writing it to Firestore would be a document write per day
 * opened — for a dot. The rules would have to be widened for it too:
 * `v1_user_calendar_months` is `allow write: if false`, backend-owned.
 *
 * The cost of keeping it local is the honest one: a second phone starts with an
 * empty record and badges the days its friends have answered, once each. Nothing
 * is lost, and nothing is wrong — that phone genuinely never showed them.
 *
 * Held in memory and mirrored to `AsyncStorage`, keyed per account so signing
 * into another one never inherits what this one had seen. An **external store**
 * like `calendarCache`: it moves from the question sheet, which is not the Stats
 * screen's own render, and `useSeenFriendAnswers` reads it through
 * `useSyncExternalStore`.
 *
 * Nothing prunes it. One entry is a day key and a small number — a decade of
 * answering every single day is under 100 KB, and dropping an old entry would
 * put its badge back on rather than free anything worth freeing.
 */
export type SeenFriendAnswers = Record<string, number>;

const EMPTY: SeenFriendAnswers = {};

const storageKeyOf = (userId: string) => `statowrel.seen-friend-answers.${userId}`;

/**
 * The account the record in memory belongs to, `null` before anything is read.
 *
 * Which is what makes `readSeenFriendAnswers` able to say « not yet » rather
 * than « nothing seen »: badging every day of the month for the split second
 * before the store is hydrated would be a dot the user never gets to be right
 * about.
 */
let loadedFor: string | null = null;
let seen: SeenFriendAnswers = EMPTY;
/**
 * The read already out, and **which account it is for** — two callers wanting
 * the same record share it, and one wanting another account's does not wait on
 * a read that will never set what it is waiting for.
 */
let loading: { userId: string; done: Promise<void> } | null = null;

const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const subscribeToSeenFriendAnswers = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/**
 * What this device has seen, or `null` while it is still being read — the same
 * reference for as long as nothing is marked, which is the stable snapshot
 * `useSyncExternalStore` needs.
 */
export const readSeenFriendAnswers = (userId: string | null): SeenFriendAnswers | null => (
  userId !== null && loadedFor === userId ? seen : null
);

const parseSeen = (stored: string | null): SeenFriendAnswers => {
  if (stored === null) {
    return EMPTY;
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (typeof parsed !== 'object' || parsed === null) {
      return EMPTY;
    }

    return Object.entries(parsed).reduce<SeenFriendAnswers>((acc, [ dateKey, count ]) => {
      if (typeof count === 'number' && count > 0) {
        acc[dateKey] = count;
      }

      return acc;
    }, {});
  } catch (error) {
    // A corrupted record is worth one round of badges, never a crash on the
    // app's root screen.
    console.warn('[stats] could not read the friends\' answers already seen', error);

    return EMPTY;
  }
};

/**
 * Reads this account's record into memory, once.
 *
 * Never rejects: a storage that cannot be read leaves the record empty, which
 * badges each day once and then behaves.
 */
const read = async (userId: string): Promise<void> => {
  const stored = await AsyncStorage.getItem(storageKeyOf(userId)).catch((error: unknown) => {
    console.warn('[stats] could not read the friends\' answers already seen', error);

    return null;
  });

  // Another account may have signed in while this read was out — it owns the
  // record now, and this one has nothing left to say.
  if (loading?.userId !== userId) {
    return;
  }

  seen = parseSeen(stored);
  loadedFor = userId;
  loading = null;
  notify();
};

const hydrate = async (userId: string): Promise<void> => {
  if (loadedFor === userId) {
    return;
  }

  if (loading?.userId !== userId) {
    loading = { userId, done: read(userId) };
  }

  await loading.done;
};

/** Hydrates the record for the signed-in account — `useSeenFriendAnswers` on mount, and at every sign-in. */
export const loadSeenFriendAnswers = (userId: string): void => {
  void hydrate(userId);
};

/**
 * Records that day `dateKey` has been looked at, with `answeredFriends` friends
 * listed on it.
 *
 * The mark is the **highest** of that count and the day's own counter, not the
 * count alone: the counter never goes down (see `v1_user_calendar_month.ts`), so
 * a friend removed since they answered would otherwise leave it permanently
 * above what the screen can ever list, and the day would keep its dot forever.
 *
 * Hydrates first when it has to — the question sheet can be reached from a
 * notification, before the Stats screen has ever mounted — so a mark is never
 * written into a record that is about to be replaced by the stored one.
 */
export const markFriendAnswersSeen = (userId: string, dateKey: string, answeredFriends: number): void => {
  void hydrate(userId).then(() => {
    if (loadedFor !== userId) {
      return;
    }

    const month = readCalendarMonth(userId, monthKeyOf(dateKey));
    const count = Math.max(answeredFriends, month?.friendAnswers[monthDayKeyOf(dateKey)] ?? 0);

    if (count === 0 || (seen[dateKey] ?? 0) >= count) {
      return;
    }

    seen = { ...seen, [dateKey]: count };
    notify();

    AsyncStorage.setItem(storageKeyOf(userId), JSON.stringify(seen)).catch((error: unknown) => {
      // The badge is already gone on screen; it comes back at the next launch,
      // which is the whole of what a failed write costs.
      console.warn('[stats] could not store the friends\' answers seen', dateKey, error);
    });
  });
};
