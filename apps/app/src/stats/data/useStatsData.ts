import {
  DAILY_QUESTION_MONTH_COLLECTION,
  dailyQuestionMonthConverter,
  monthDayKeyOf,
  monthKeyOf,
} from '@statowrel/models';
import { useFocusEffect } from '@react-navigation/native';
import { getDocs, limit, orderBy, query } from '@react-native-firebase/firestore';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { useAuth } from '@/auth/AuthContext';
import { getAnswersVersion, readAnswer, readAnswerDays, subscribeToAnswers } from '@/daily-question/data/answerStore';
import { startOfDay, startOfMonth, toDateKey } from '@/lib/dates';
import { getCollectionRef } from '@/lib/firestore';
import {
  emptyCalendarMonth,
  loadCalendarMonth,
  readCalendarMonth,
  subscribeToCalendarCache,
} from '@/stats/data/calendarCache';

export type { CalendarMonth } from '@/stats/data/calendarCache';

/**
 * The `YYYY-MM` of the very first month a question was ever broadcast in — how
 * far back the calendar lets one walk (docs/prd.md §5.2), and `null` while it
 * loads or when nothing has ever been published.
 *
 * The archive is bounded by the questions, not by the account: a user arriving
 * today can catch up on everything that came before them (docs/prd.md §4.2), so
 * the lower bound is the same for everybody. One read, once per session — the
 * first month never moves.
 */
const readArchiveStart = async (): Promise<string | null> => {
  const months = getCollectionRef(DAILY_QUESTION_MONTH_COLLECTION, dailyQuestionMonthConverter);
  const snapshot = await getDocs(query(months, orderBy('month'), limit(1)));

  return snapshot.docs[0]?.id ?? null;
};

/**
 * Where the Stats screen gets its data.
 *
 * The profile comes from `AuthContext`, which subscribes to `v1_users/{uid}` —
 * so the streak, the record and the answered-days total cost nothing here and
 * move on their own. Only the displayed month is read here, and it is **read**:
 * two `getDoc` through `calendarCache`, never a subscription.
 *
 * **Why no listener on the calendar.** Nothing writes into a calendar month on
 * its own behalf while the screen is up. The two things that move it are both
 * this user's own doing — they answered a day, or the 07:00 draw landed while
 * the app was in the background — and each has a moment it can be picked up at,
 * for two reads, rather than holding two open connections per visited month
 * through the hours nothing happens. So the refresh policy is three rules, and
 * `calendarCache` is what makes them cheap:
 *
 * - **A month is read once and kept**, for as long as the app runs. Walking
 *   back to March and returning costs nothing the second time.
 * - **Answering drops the month it belongs to** (`rememberAnswer` →
 *   `invalidateCalendarMonth`), so a copy taken before the answer existed is
 *   never shown again. Until the answer trigger has projected the day, the
 *   session's own answers are laid over the month — see `calendar` below.
 * - **Coming back to the screen, and pulling it down, re-read.** The first
 *   covers the answer just given and the day that dropped overnight; the second
 *   is the way out whenever anything else looks stale.
 */
export const useStatsData = () => {
  const { user, profile } = useAuth();
  const userId = user?.uid ?? null;

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayKey = toDateKey(today);
  const [ month, selectMonth ] = useState(() => startOfMonth(today));
  const monthKey = monthKeyOf(toDateKey(month));
  // Read from its own clock rather than derived from `today`, which is handed
  // back to the screen: a value that leaves the hook cannot be a dependency the
  // React compiler is willing to memoize `reload` on.
  const currentMonthKey = useMemo(() => monthKeyOf(toDateKey(startOfDay(new Date()))), []);

  const [ archiveStart, setArchiveStart ] = useState<string | null>(null);
  const [ refreshing, setRefreshing ] = useState(false);

  // The two module stores this screen is built on: the months already read, and
  // the answers this session wrote. Both move from outside a render — a fetch
  // landing, an answer written in the question sheet — which is exactly what
  // `useSyncExternalStore` is for.
  //
  // A cached month is handed over by reference and keeps it until the cache
  // moves, which is the snapshot the store owes React. The answers have no such
  // snapshot to offer — the overlay below is built per read — so that one is
  // subscribed to for the re-render alone, the way the banner already did.
  const stored = useSyncExternalStore(
    subscribeToCalendarCache,
    () => readCalendarMonth(userId, monthKey),
  );
  const currentMonth = useSyncExternalStore(
    subscribeToCalendarCache,
    () => readCalendarMonth(userId, currentMonthKey),
  );

  useSyncExternalStore(subscribeToAnswers, getAnswersVersion);

  /**
   * Reads the months the screen is showing: the displayed one, and the current
   * one whenever it is another — the banner reads the current month, not the
   * displayed one, so browsing back to March must not stop today's question
   * from appearing at the top of the screen.
   */
  const reload = useCallback(async (force: boolean) => {
    if (userId === null) {
      return;
    }

    await loadCalendarMonth(userId, monthKey, force);

    if (monthKey !== currentMonthKey) {
      await loadCalendarMonth(userId, currentMonthKey, force);
    }
  }, [ userId, monthKey, currentMonthKey ]);

  useEffect(() => {
    if (userId === null) {
      return undefined;
    }

    let cancelled = false;

    readArchiveStart()
      .then((firstMonth) => {
        if (!cancelled) {
          setArchiveStart(firstMonth);
        }
      })
      .catch((error: unknown) => {
        // Without it the calendar simply stays on the current month rather than
        // opening onto an archive it cannot bound.
        console.warn('[stats] could not read the first published month', error);
      });

    return () => {
      cancelled = true;
    };
  }, [ userId ]);

  // Mount, sign-in, and every chevron. A month already in the cache is shown
  // without a round trip, and the answer that dropped it from the cache is what
  // turns this back into a real read.
  useEffect(() => {
    void reload(false);
  }, [ reload ]);

  // Coming back to the screen re-reads, whatever the cache holds: the sheet
  // just closed may have written an answer, and a night in the background may
  // have crossed 07:00. The first focus is the mount above.
  //
  // `reload` is reached through a ref rather than closed over, so this effect's
  // identity never moves: React Navigation re-runs a focus effect whose callback
  // changed, and depending on `reload` would turn every chevron into a forced
  // re-read.
  const focused = useRef(false);
  const latestReload = useRef(reload);

  useEffect(() => {
    latestReload.current = reload;
  }, [ reload ]);

  useFocusEffect(useCallback(() => {
    if (focused.current) {
      void latestReload.current(true);
    }

    focused.current = true;
  }, []));

  /** Pull to refresh — the same read, with the spinner the gesture owes the user. */
  const refresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await reload(true);
    } finally {
      setRefreshing(false);
    }
  }, [ reload ]);

  const todayMonthDayKey = monthDayKeyOf(todayKey);

  /**
   * The displayed month, with this session's own answers laid over it.
   *
   * The overlay is what replaces the subscription: the app writes the answer,
   * the answer trigger projects it into the month a beat later, and a refresh
   * fired in between would otherwise come back saying the day is unanswered.
   * Once the trigger has landed both halves say the same thing and the merge is
   * a no-op.
   */
  const read = stored ?? emptyCalendarMonth(monthKey);
  const answeredThisSession = readAnswerDays(userId, monthKey);
  const calendar = Object.keys(answeredThisSession).length === 0
    ? read
    : { ...read, answered: { ...read.answered, ...answeredThisSession } };

  return {
    /** `v1_users/{uid}`, live — see `AuthContext`. Null while it loads, and until the onboarding sheet has created it. */
    profile,
    today,
    month,
    selectMonth,
    /**
     * `YYYY-MM` of the oldest month the calendar can reach — the first month a
     * question was broadcast in, whether or not the account existed then.
     */
    archiveStart,
    /**
     * The displayed month. Empty until its read lands, which renders as an
     * inert month rather than as a wrong one — the key always follows `month`.
     */
    calendar,
    /**
     * Today's question, straight off the month index — `null` before the 07:00
     * drop, and until the screen is next refreshed after it.
     *
     * The banner reads the *current* month, not the displayed one: browsing
     * back to March must not make today's question disappear from the top of
     * the screen.
     */
    todayQuestion: currentMonth?.published[todayMonthDayKey] ?? null,
    // The month index is written by the answer trigger, which has not
    // necessarily run yet when the user comes back from the sheet — so an
    // answer given during this session counts on its own.
    answeredToday: currentMonth?.answered[todayMonthDayKey] !== undefined
      || readAnswer(userId, todayKey) !== null,
    loading: userId !== null && stored === null,
    /** True while a pull to refresh is out — the `RefreshControl`'s own state. */
    refreshing,
    /** Re-reads the displayed month and the current one, cache bypassed. */
    refresh,
  };
};
