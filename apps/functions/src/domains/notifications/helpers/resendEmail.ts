import { logger } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import { z } from 'zod';

/**
 * Resend's HTTP API, the transport every e-mail leaves through.
 *
 * The same shape as `expoPush.ts` next door, and for the same reason: the way
 * out of the backend is one `fetch` against a provider that already holds the
 * credentials and the deliverability. An SMTP client would mean a native-ish
 * dependency and a connection to keep alive for a message sent once a morning.
 *
 * The batch endpoint takes the whole list in one request. It is what a digest
 * addressed to every moderator needs — one round trip, whoever holds the claim.
 */
const RESEND_BATCH_ENDPOINT = 'https://api.resend.com/emails/batch';

/** Resend accepts at most 100 messages per batch request. */
const MESSAGES_PER_REQUEST = 100;

/**
 * The API key, held in Secret Manager rather than in the environment.
 *
 * `apps/functions/CLAUDE.md` says there are no env params, deliberately — a
 * `defineString()` turns every deploy into an interactive prompt. A
 * `defineSecret()` is the exception the rule leaves open: the CLI asks for the
 * value **once**, stores it in Secret Manager, and every later deploy reads it
 * from there. A credential is also the one thing that must never be committed,
 * which rules out shipping it in a `.env.<projectId>`.
 *
 * Every function sending mail has to declare it in its own `secrets: []`, or
 * the runtime hands it an empty string.
 */
export const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

/**
 * Who the mail comes from.
 *
 * A sender is not a credential, so it stays a plain `process.env` read — the
 * same thing `EXPO_ACCESS_TOKEN` does, and it costs no deploy-time prompt. The
 * fallback is Resend's own shared sender, which needs no verified domain but
 * only ever delivers to the address the Resend account was opened with: enough
 * to see the digest land, not enough for a second moderator. Set
 * `RESEND_FROM` once a domain is verified.
 */
const senderAddress = (): string => process.env.RESEND_FROM || 'StatOwrel <onboarding@resend.dev>';

export interface EmailMessage {
  /** Recipient address. One per message — the digest is addressed to each moderator, not to a visible list of them. */
  to: string;
  subject: string;
  /** HTML body, what every mail client shows. */
  html: string;
  /** Plain-text body, what the rest falls back to and what a spam filter reads. */
  text: string;
}

const responseSchema = z.object({ data: z.array(z.object({ id: z.string() })) });

const chunk = <T>(items: T[], size: number): T[][] => (
  items.reduce<T[][]>((chunks, item, index) => {
    if (index % size === 0) {
      chunks.push([]);
    }

    chunks[chunks.length - 1].push(item);

    return chunks;
  }, [])
);

const postBatch = async (apiKey: string, from: string, messages: EmailMessage[]): Promise<void> => {
  const response = await fetch(RESEND_BATCH_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages.map((message) => ({ from, ...message }))),
  });

  if (!response.ok) {
    // Throwing rather than swallowing. Resend answers its own error body, which
    // names the cause — an unverified sender, a key without send rights — and a
    // digest that silently did not go out looks exactly like a morning with
    // nothing to moderate, which is the one confusion this feature cannot
    // afford.
    throw new Error(`Resend refused the batch (${response.status} ${response.statusText}): ${await response.text()}`);
  }

  const body = responseSchema.safeParse(await response.json());

  if (!body.success) {
    throw new Error(`Resend answered an unreadable body: ${body.error.issues.map((issue) => issue.message).join(', ')}`);
  }

  if (body.data.data.length !== messages.length) {
    throw new Error(`Resend accepted ${body.data.data.length} of ${messages.length} messages`);
  }
};

/**
 * Sends every message, or throws.
 *
 * An accepted message is queued, not delivered — Resend's own bounce and
 * complaint webhooks are what say the rest, and nothing here subscribes to
 * them. What it does catch is the failure worth catching at this cadence: a
 * refused request, which the caller lets fail so the run shows up red in the
 * logs instead of passing for a quiet morning.
 */
export const sendEmails = async (messages: EmailMessage[]): Promise<void> => {
  if (messages.length === 0) {
    return;
  }

  const apiKey = RESEND_API_KEY.value();

  if (apiKey === '') {
    throw new Error('RESEND_API_KEY is empty — the sending function must declare it in its own `secrets: []`');
  }

  const from = senderAddress();

  for (const batch of chunk(messages, MESSAGES_PER_REQUEST)) {
    await postBatch(apiKey, from, batch);
  }

  logger.info('E-mails sent', { messages: messages.length, from });
};
