import { navigationRef } from '@/navigation/navigationRef';

/** How often the container is re-checked while it is still mounting. */
const READY_POLL_MS = 50;

/**
 * How long a tap is worth holding on to. Long enough to cover a cold start —
 * the fonts, the persisted session and the first Firestore snapshot all resolve
 * before the navigator mounts — short enough that a tap can never resurface
 * minutes later on a screen the user has since navigated away from.
 */
const READY_TIMEOUT_MS = 5000;

/**
 * Opens a day's question from outside the tree — a notification tap, which has
 * no component and no `useNavigation()` to go through.
 *
 * The wait is what makes a *cold* start work: the tap that launched the app is
 * read as soon as the notification hook mounts, which can be the very commit
 * the navigator mounts on, before the container reports itself ready. Nothing
 * queues a navigation for that moment, so this holds the day until it can.
 */
export const openDailyQuestion = (date: string, waited = 0): void => {
  if (navigationRef.isReady()) {
    navigationRef.navigate('DailyQuestion', { date });

    return;
  }

  if (waited >= READY_TIMEOUT_MS) {
    console.warn('[notifications] the navigator never became ready, dropping the tap', date);

    return;
  }

  setTimeout(() => openDailyQuestion(date, waited + READY_POLL_MS), READY_POLL_MS);
};
