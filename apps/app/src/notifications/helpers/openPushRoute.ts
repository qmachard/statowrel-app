import { navigationRef } from '@/navigation/navigationRef';
import type { PushRoute } from '@/notifications/helpers/pushRoute';

/** How often the container is re-checked while it is still mounting. */
const READY_POLL_MS = 50;

/**
 * How long a tap is worth holding on to. Long enough to cover a cold start —
 * the fonts, the persisted session and the first Firestore snapshot all resolve
 * before the navigator mounts — short enough that a tap can never resurface
 * minutes later on a screen the user has since navigated away from.
 */
const READY_TIMEOUT_MS = 5000;

const navigate = (route: PushRoute): void => {
  if (route.type === 'friend_invite' || route.type === 'referral_joined') {
    // Both land on the Menu: the invitation is answered from the friend list
    // (docs/prd.md §5.3), and « Mes filleuls » sits right under it (§4.9).
    // Neither has a screen of its own to open.
    navigationRef.navigate('Menu');

    return;
  }

  navigationRef.navigate('DailyQuestion', { date: route.date });
};

/**
 * Opens what a notification points at, from outside the tree — a tap has no
 * component and no `useNavigation()` to go through.
 *
 * The wait is what makes a *cold* start work: the tap that launched the app is
 * read as soon as the notification hook mounts, which can be the very commit
 * the navigator mounts on, before the container reports itself ready. Nothing
 * queues a navigation for that moment, so this holds the route until it can.
 */
export const openPushRoute = (route: PushRoute, waited = 0): void => {
  if (navigationRef.isReady()) {
    navigate(route);

    return;
  }

  if (waited >= READY_TIMEOUT_MS) {
    console.warn('[notifications] the navigator never became ready, dropping the tap', route.type);

    return;
  }

  setTimeout(() => openPushRoute(route, waited + READY_POLL_MS), READY_POLL_MS);
};
