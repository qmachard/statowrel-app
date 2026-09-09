import { logger } from 'firebase-functions/v2';

import { type ExpoPushMessage, DEVICE_NOT_REGISTERED, sendExpoPushMessages } from './expoPush';
import { type RegisteredDevice, deleteDevices, listRegisteredDevices, listUserDevices } from './deviceTokens';

export interface PushNotification {
  title: string;
  body: string;
  /** Handed back to the app when the notification is tapped — this is what routes it to a screen. */
  data?: Record<string, string>;
  /** Android channel the notification is posted in. Required for it to show at all on Android. */
  channelId: string;
}

export interface PushDeliveryReport {
  /** Messages Expo queued. */
  sent: number;
  /** Messages Expo refused, dead tokens included. */
  failed: number;
  /** Dead tokens deleted as a result. */
  pruned: number;
}

/** One device and the notification it is to receive — a fan-out, resolved. */
interface PushDelivery {
  device: RegisteredDevice;
  notification: PushNotification;
}

const NOTHING_SENT: PushDeliveryReport = { sent: 0, failed: 0, pruned: 0 };

/**
 * Posts every resolved delivery and prunes the tokens Expo says nobody holds
 * any more — the half of a fan-out that does not depend on *who* is notified.
 *
 * Pairing the notification with the device rather than taking one for the whole
 * batch is what lets the 18:00 nudge give everybody a different count while the
 * 07:00 drop hands out the same line to all.
 */
const deliver = async (deliveries: PushDelivery[]): Promise<PushDeliveryReport> => {
  if (deliveries.length === 0) {
    logger.info('No registered device, nothing to push');

    return NOTHING_SENT;
  }

  const messages = deliveries.map<ExpoPushMessage>(({ device, notification }) => ({
    to: device.push_token,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    channelId: notification.channelId,
  }));

  // Aligned with `messages`, hence with `deliveries` — that index is what maps
  // a rejection back to the document holding the token it rejected.
  const tickets = await sendExpoPushMessages(messages);

  const dead = deliveries.filter((_, index) => {
    const ticket = tickets[index];

    return ticket !== undefined && ticket.status === 'error' && ticket.code === DEVICE_NOT_REGISTERED;
  });

  await deleteDevices(dead.map(({ device }) => device.ref));

  const failed = tickets.filter((ticket) => ticket.status === 'error').length;

  logger.info('Push fan-out done', { sent: tickets.length - failed, failed, pruned: dead.length });

  return { sent: tickets.length - failed, failed, pruned: dead.length };
};

const sendPushToDevices = async (
  devices: RegisteredDevice[],
  notification: PushNotification,
): Promise<PushDeliveryReport> => deliver(devices.map((device) => ({ device, notification })));

/**
 * Pushes one notification to the devices of **one** account — a friend
 * invitation landing in somebody's list (docs/prd.md §4.1), as opposed to the
 * day's question, which goes to everyone.
 *
 * Everything the fan-out says about delivery holds here too, and costs less:
 * an account with no registered device — signed out, or notifications refused
 * — is simply nobody to push to, not a failure.
 */
export const sendPushToUser = async (
  userId: string,
  notification: PushNotification,
): Promise<PushDeliveryReport> => (
  sendPushToDevices(await listUserDevices(userId), notification)
);

/**
 * Pushes a notification of its own to each user holding a device — the whole
 * fan-out, whatever it says to whom: the 07:00 drop, where almost everybody
 * gets the same line and the two authors of docs/prd.md §4.7 get theirs, and
 * the 18:00 nudge, whose body carries a count only that user's friend list
 * makes true (docs/prd.md §4.5).
 *
 * `notificationFor` is asked once per registered device and answers `null` for
 * whoever is not concerned: the recipients of a per-user fan-out are decided by
 * the caller's data, never by who happens to own a phone, and a user with three
 * of them gets the same line on all three. A fan-out that says the same thing
 * to everyone is this one with a constant callback — there is no cheaper shape
 * to have, since the collection-group read is the cost.
 *
 * One collection-group read rather than a `sendPushToUser` per recipient: a
 * morning's recipients are the whole database, and a read each would be a query
 * per account to send a batch that goes out in one request anyway.
 *
 * Sending is not transactional and nothing tracks who got what: a push is a
 * hint, and the app reads the day from Firestore on launch either way. So a
 * partial fan-out is a partial fan-out, and the caller's retry sends the whole
 * thing again rather than resuming it — which is safe precisely because the
 * duplicate cost is one extra banner.
 *
 * The tokens Expo rejects as `DeviceNotRegistered` are deleted on the way out.
 * That is the only self-healing the system has: without it every uninstall
 * would stay in the batch for good.
 */
export const sendPushToUsers = async (
  notificationFor: (userId: string) => PushNotification | null,
): Promise<PushDeliveryReport> => {
  const devices = await listRegisteredDevices();

  return deliver(devices.reduce<PushDelivery[]>((resolved, device) => {
    const notification = notificationFor(device.user_id);

    if (notification !== null) {
      resolved.push({ device, notification });
    }

    return resolved;
  }, []));
};

/**
 * How many device reads are in flight at once — the same ceiling
 * `friendsAnswersDigest` holds itself to, and for the same reason: a few
 * hundred parallel reads exhaust the Admin SDK's connection pool long before
 * Firestore complains.
 */
const READS_IN_FLIGHT = 20;

/**
 * Pushes a notification of its own to a **named** set of accounts — the 21:00
 * streak reminder (docs/prd.md §4.6), whose recipients are the handful of
 * people about to lose a streak rather than everybody holding a phone.
 *
 * The third shape rather than a flag on the second, because the cost is
 * inverted. `sendPushToUsers` pays one collection-group read of every
 * registered device to reach a majority, which is the right trade at 07:00 and
 * at 18:00. Here the recipients are a minority the caller has already
 * computed, and reading the whole device collection to discard most of it
 * would make the reminder's cost grow with the install base instead of with
 * the number of streaks actually at risk.
 *
 * So it reads one sub-collection per recipient, `READS_IN_FLIGHT` at a time,
 * and hands the lot to the same `deliver` — one Expo batch, the same pruning
 * of dead tokens, the same non-transactional guarantees.
 */
export const sendPushToSomeUsers = async (
  userIds: string[],
  notificationFor: (userId: string) => PushNotification | null,
): Promise<PushDeliveryReport> => {
  const deliveries: PushDelivery[] = [];

  for (let index = 0; index < userIds.length; index += READS_IN_FLIGHT) {
    const batch = userIds.slice(index, index + READS_IN_FLIGHT);

    const resolved = await Promise.all(batch.map(async (userId) => ({
      devices: await listUserDevices(userId),
      notification: notificationFor(userId),
    })));

    for (const { devices, notification } of resolved) {
      if (notification === null) {
        continue;
      }

      for (const device of devices) {
        deliveries.push({ device, notification });
      }
    }
  }

  return deliver(deliveries);
};
