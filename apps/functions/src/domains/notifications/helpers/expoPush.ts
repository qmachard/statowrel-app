import { logger } from 'firebase-functions/v2';
import { z } from 'zod';

/**
 * Expo's push service, the transport every notification leaves through.
 *
 * The app is managed Expo with no native Firebase (`app.config.ts` declares no
 * `googleServicesFile`), so `expo-notifications` hands out Expo tokens rather
 * than FCM/APNs ones and `firebase-admin`'s own messaging has nothing to send
 * to. Expo holds the store credentials EAS already manages and fans out to
 * both platforms behind one endpoint.
 */
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

/** Expo accepts at most 100 messages per request. */
const MESSAGES_PER_REQUEST = 100;

export interface ExpoPushMessage {
  /** The recipient's Expo push token. */
  to: string;
  title: string;
  body: string;
  /** Handed back to the app when the notification is tapped. Strings only — it travels as JSON through APNs and FCM. */
  data?: Record<string, string>;
  /** Android channel the notification is posted in; ignored on iOS. */
  channelId?: string;
}

/**
 * What Expo answered for one message — a *ticket*, not a delivery: an accepted
 * message is only queued. The receipt that says whether it reached the device
 * is fetched later from `/push/getReceipts`, which this does not do yet; the
 * error that matters most, a token nobody holds any more, already comes back
 * here.
 */
export type ExpoPushTicket =
  | { status: 'ok' }
  | { status: 'error'; message: string; code: string | null };

const ticketSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), id: z.string().optional() }),
  z.object({
    status: z.literal('error'),
    message: z.string(),
    details: z.object({ error: z.string().optional() }).nullish(),
  }),
]);

const responseSchema = z.object({ data: z.array(ticketSchema) });

/** Expo's own name for a token the device has revoked — uninstalled, or notifications turned off. */
export const DEVICE_NOT_REGISTERED = 'DeviceNotRegistered';

const chunk = <T>(items: T[], size: number): T[][] => (
  items.reduce<T[][]>((chunks, item, index) => {
    if (index % size === 0) {
      chunks.push([]);
    }

    chunks[chunks.length - 1].push(item);

    return chunks;
  }, [])
);

const authorizationHeaders = (): Record<string, string> => {
  // Only needed once "enhanced security for push notifications" is turned on
  // for the Expo account; unset, Expo accepts the request unauthenticated.
  const accessToken = process.env.EXPO_ACCESS_TOKEN;

  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

const postBatch = async (messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> => {
  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authorizationHeaders(),
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    // Throwing rather than swallowing: the caller runs inside a Cloud Task, so
    // a refused batch is retried instead of being lost. Expo answers 4xx for a
    // malformed batch and 429/5xx for its own trouble; both are worth a retry
    // at a day's cadence.
    throw new Error(`Expo push refused the batch (${response.status} ${response.statusText})`);
  }

  const body = responseSchema.safeParse(await response.json());

  if (!body.success) {
    throw new Error(`Expo push answered an unreadable body: ${body.error.issues.map((issue) => issue.message).join(', ')}`);
  }

  if (body.data.data.length !== messages.length) {
    // Expo answers one ticket per message, in order — the whole contract this
    // function's aligned return relies on.
    throw new Error(`Expo push answered ${body.data.data.length} tickets for ${messages.length} messages`);
  }

  return body.data.data.map((ticket) => (
    ticket.status === 'ok'
      ? { status: 'ok' as const }
      : { status: 'error' as const, message: ticket.message, code: ticket.details?.error ?? null }
  ));
};

/**
 * Sends every message and returns one ticket per message, **in the same
 * order** — the caller matches a failure back to the token that caused it by
 * index, which is why nothing here filters or reorders.
 *
 * Batches go out one after the other rather than all at once: Expo rate-limits
 * on notifications per second, and a once-a-day fan-out has no deadline worth
 * racing it for.
 */
export const sendExpoPushMessages = async (messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> => {
  const tickets: ExpoPushTicket[] = [];

  for (const batch of chunk(messages, MESSAGES_PER_REQUEST)) {
    tickets.push(...await postBatch(batch));
  }

  logger.info('Expo push batches sent', {
    messages: messages.length,
    failed: tickets.filter((ticket) => ticket.status === 'error').length,
  });

  return tickets;
};
