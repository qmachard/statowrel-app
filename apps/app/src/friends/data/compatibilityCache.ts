import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FriendCompatibilityResult } from '@statowrel/models';

/**
 * The compatibility scores this device already knows, per friend — the second
 * of the two caches standing in front of `friends-getFriendCompatibility`.
 *
 * The **backend** one is the real bound: the callable recomputes a pair at most
 * once per Paris day, whoever asks and however often (see
 * `v1_friend_compatibility.ts`). This one is about the round trip rather than
 * the computation — without it, walking back and forth between the friend list
 * and a profile calls the function every time to be told the same three numbers
 * it was told a second ago.
 *
 * Keyed on the day the score was computed on, so it expires by itself: a stored
 * entry is served while its `computed_on` is today's key and ignored the moment
 * it is not. Nothing has to be invalidated, and no clock has to be trusted
 * beyond the one the whole app already runs on.
 *
 * **Local, and only a cache.** It holds nothing that is not derived from the
 * answers, so it is safe to lose, safe to be stale for at most a day, and safe
 * to be wrong — the next call rebuilds it. Kept per account, like
 * `seenFriendAnswers`, so signing into another one never inherits this one's
 * scores.
 *
 * Nothing prunes it. An entry is a UID and three small numbers; a removed
 * friend leaves one behind, which is a few dozen bytes against a friend list
 * §4.1 caps at nobody's idea of large.
 */
type CompatibilityCache = Record<string, FriendCompatibilityResult>;

const storageKeyOf = (userId: string) => `statowrel.friend-compatibility.${userId}`;

/**
 * The account the record in memory belongs to, `null` before anything has been
 * read — the same shape `seenFriendAnswers` uses, and for the same reason: the
 * first read has to be able to tell « not loaded yet » from « nothing cached ».
 */
let loadedFor: string | null = null;
let cache: CompatibilityCache = {};

const load = async (userId: string): Promise<CompatibilityCache> => {
  if (loadedFor === userId) {
    return cache;
  }

  try {
    const stored = await AsyncStorage.getItem(storageKeyOf(userId));

    cache = stored === null ? {} : (JSON.parse(stored) as CompatibilityCache);
  } catch (error) {
    // A cache that cannot be read is a cache that is empty — the callable is
    // the source, and it answers the same thing either way.
    console.warn('[friends] could not read the compatibility cache', error);
    cache = {};
  }

  loadedFor = userId;

  return cache;
};

/**
 * The score this device holds for a friend, if it was computed **today**.
 *
 * `null` for anything else — no entry, an entry from yesterday, an unreadable
 * store. The caller's next move is the same in all three cases: call the
 * function.
 */
export const readCompatibility = async (
  userId: string,
  friendId: string,
  today: string,
): Promise<FriendCompatibilityResult | null> => {
  const entries = await load(userId);
  const entry = entries[friendId];

  return entry !== undefined && entry.computed_on === today ? entry : null;
};

/** Keeps a score the callable just handed back. Failing to store it costs a round trip, nothing else. */
export const writeCompatibility = async (
  userId: string,
  friendId: string,
  compatibility: FriendCompatibilityResult,
): Promise<void> => {
  const entries = await load(userId);

  cache = { ...entries, [friendId]: compatibility };

  try {
    await AsyncStorage.setItem(storageKeyOf(userId), JSON.stringify(cache));
  } catch (error) {
    console.warn('[friends] could not store the compatibility', error);
  }
};
