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

const sendPushToDevices = async (
  devices: RegisteredDevice[],
  notification: PushNotification,
): Promise<PushDeliveryReport> => {
  if (devices.length === 0) {
    logger.info('No registered device, nothing to push');

    return { sent: 0, failed: 0, pruned: 0 };
  }

  const messages = devices.map<ExpoPushMessage>((device) => ({
    to: device.push_token,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    channelId: notification.channelId,
  }));

  // Aligned with `messages`, hence with `devices` — that index is what maps a
  // rejection back to the document holding the token it rejected.
  const tickets = await sendExpoPushMessages(messages);

  const dead = devices.filter((_, index) => {
    const ticket = tickets[index];

    return ticket !== undefined && ticket.status === 'error' && ticket.code === DEVICE_NOT_REGISTERED;
  });

  await deleteDevices(dead.map((device) => device.ref));

  const failed = tickets.filter((ticket) => ticket.status === 'error').length;

  logger.info('Push fan-out done', { sent: tickets.length - failed, failed, pruned: dead.length });

  return { sent: tickets.length - failed, failed, pruned: dead.length };
};

/**
 * Pushes one notification to every registered device — the fan-out behind the
 * day's question (docs/prd.md §4.2).
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
export const sendPushToAllDevices = async (notification: PushNotification): Promise<PushDeliveryReport> => (
  sendPushToDevices(await listRegisteredDevices(), notification)
);

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
