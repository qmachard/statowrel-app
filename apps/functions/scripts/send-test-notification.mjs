#!/usr/bin/env node
//
// Sends the day's notification to a phone, by hand — the one part of the daily
// cycle that cannot be checked from a screen, since it leaves the backend and
// only comes back as a banner on a device.
//
// It sends exactly what `dailyQuestions-notifyDailyQuestion` sends: the same
// title, the same body (the label of the question that ran the day, copied onto
// `v1_daily_question_months`), the same `channelId`, and the same
// `{ type: 'daily_question', date }` payload — so a tap routes to `DailyQuestion`
// through `apps/app/src/notifications/`, and a test that works means the real
// thing works.
//
//   npm run send-test-notification -- --email moi@exemple.fr    # every device of that account
//   npm run send-test-notification -- --uid <uid>
//   npm run send-test-notification -- --token 'ExponentPushToken[…]'
//   npm run send-test-notification -- --email moi@exemple.fr --date 2026-08-19
//   npm run send-test-notification -- --email moi@exemple.fr --body 'Coucou'
//   npm run send-test-notification -- --email moi@exemple.fr --nudge --friends 3   # the 18:00 nudge
//   npm run send-test-notification -- --all                     # every registered device
//   npm run send-test-notification -- --dry-run
//
// **There is no emulator for Expo push.** `FIRESTORE_EMULATOR_HOST` decides
// where the *tokens* are read from, and nothing else: the token is real, the
// phone is real, and the banner really lands. Which is also why `--all` is
// refused on production without `--force`.
//
//   FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
//     npm run send-test-notification -- --email moi@exemple.fr
//
// Authenticates with Application Default Credentials:
//   gcloud auth application-default login
//
// Set EXPO_ACCESS_TOKEN once "enhanced security for push notifications" is on
// for the Expo account; unset, Expo accepts the request unauthenticated.

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { GeoPoint, getFirestore, Timestamp } from 'firebase-admin/firestore';

import { die, resolveProjectId } from './lib/firebase-project.mjs';

const USAGE = 'Usage: npm run send-test-notification -- [--email <email> | --uid <uid> | --token <token> | --all] '
  + '[--date <YYYY-MM-DD>] [--nudge] [--friends <n>] [--title <text>] [--body <text>] [--no-receipts] '
  + '[--production | --project <id>] [--dry-run] [--force]';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_ENDPOINT = 'https://exp.host/--/api/v2/push/getReceipts';

/** Expo accepts at most 100 messages per request — same bound as `helpers/expoPush.ts`. */
const MESSAGES_PER_REQUEST = 100;

/** docs/prd.md §3 — the line the whole daily loop starts on, and what the task sends. */
const NOTIFICATION_TITLE = 'La question du jour est tombée';

const FALLBACK_BODY = 'Tu as jusqu\'à minuit pour répondre.';

/**
 * The 18:00 nudge, copied from `tasks/notifyFriendsAnswers.ts` — `--nudge`
 * sends that one instead of the 07:00 drop, with the count `--friends` names
 * rather than a real one: the point is to read the line on a lock screen, and
 * counting for real would mean answering as somebody else first.
 */
const NUDGE_TITLE = 'Tes potes ont répondu';

const NUDGE_TITLE_ALONE = 'Tes potes attendent ta réponse';

const nudgeBody = (friends) => {
  if (friends === 0) {
    return 'Ne perds pas ta série : tu as jusqu\'à minuit pour répondre.';
  }

  if (friends === 1) {
    return 'Un de tes potes a répondu à la question du jour. Et toi ?';
  }

  return `${friends} de tes potes ont répondu à la question du jour. Et toi ?`;
};

/**
 * How long Expo is given to turn a ticket into a receipt.
 *
 * A ticket only says "queued"; the receipt is what says APNs or FCM took it.
 * That is the difference between "le script a marché" and "le téléphone a
 * sonné", so it is worth the wait — `--no-receipts` skips it.
 */
const RECEIPTS_DELAY_MS = 4000;

const parseArgs = (argv) => {
  const parsed = {
    email: null,
    uid: null,
    tokens: [],
    all: false,
    date: null,
    nudge: false,
    friends: 0,
    title: null,
    body: null,
    receipts: true,
    project: null,
    alias: 'default',
    dryRun: false,
    force: false,
  };

  const readValue = (value, flag) => value ?? die(`${flag} needs a value.\n${USAGE}`);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--all') {
      parsed.all = true;
    } else if (arg === '--no-receipts') {
      parsed.receipts = false;
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--force') {
      parsed.force = true;
    } else if (arg === '--production') {
      parsed.alias = 'production';
    } else if (arg === '--email') {
      parsed.email = readValue(argv[i += 1], '--email');
    } else if (arg === '--uid') {
      parsed.uid = readValue(argv[i += 1], '--uid');
    } else if (arg === '--token') {
      parsed.tokens.push(readValue(argv[i += 1], '--token'));
    } else if (arg === '--nudge') {
      parsed.nudge = true;
    } else if (arg === '--friends') {
      parsed.friends = Number(readValue(argv[i += 1], '--friends'));
      parsed.nudge = true;
    } else if (arg === '--date') {
      parsed.date = readValue(argv[i += 1], '--date');
    } else if (arg === '--title') {
      parsed.title = readValue(argv[i += 1], '--title');
    } else if (arg === '--body') {
      parsed.body = readValue(argv[i += 1], '--body');
    } else if (arg === '--project') {
      parsed.project = readValue(argv[i += 1], '--project');
    } else {
      die(`Unknown argument "${arg}".\n${USAGE}`);
    }
  }

  // A target is required rather than defaulted: the default of a script that
  // reaches real phones cannot be "all of them".
  const targets = [ parsed.email, parsed.uid, parsed.tokens.length > 0 ? 'token' : null, parsed.all || null ]
    .filter(Boolean).length;

  if (targets === 0) {
    die(`Say who to notify — --email, --uid, --token or --all.\n${USAGE}`);
  }

  if (targets > 1) {
    die(`Pick one target at a time.\n${USAGE}`);
  }

  if (!Number.isInteger(parsed.friends) || parsed.friends < 0) {
    die(`--friends takes a count of 0 or more.\n${USAGE}`);
  }

  if (parsed.date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
    die(`--date takes a YYYY-MM-DD day (got "${parsed.date}").\n${USAGE}`);
  }

  return parsed;
};

const { email, uid, tokens, all, date, nudge, friends, title, body, receipts, dryRun, force, ...selector } = parseArgs(process.argv.slice(2));
const projectId = resolveProjectId(selector);
const emulator = process.env.FIRESTORE_EMULATOR_HOST;

if (all && selector.alias === 'production' && !force) {
  die('--all on production notifies every user of the app. Add --force if that is really what you want.');
}

// The models package is TypeScript compiled to dist/, which a plain .mjs cannot
// read — the npm script builds it first, so this only fails when the script is
// run by hand from a workspace that never built it.
const {
  DAILY_QUESTION_CHANNEL_ID,
  DAILY_QUESTION_MONTH_COLLECTION,
  USER_COLLECTION,
  USER_DEVICE_COLLECTION,
  dailyQuestionDateKey,
  dailyQuestionMonthConverter,
  isExpoPushToken,
  monthDayKeyOf,
  monthKeyOf,
  userDeviceConverter,
} = await import('@statowrel/models').catch(() => (
  die('Could not load @statowrel/models — run `npm run build:models` first.')
));

initializeApp({
  projectId,
  // The emulator accepts any credential; ADC may not even be configured.
  ...(emulator ? {} : { credential: applicationDefault() }),
});

const firestore = getFirestore();

const deviceConverter = userDeviceConverter(Timestamp, GeoPoint);

/** Every device of one account — `v1_users/{uid}/v1_user_devices`, the app's own write. */
const devicesOfUser = async (userId) => {
  const snapshot = await firestore
    .collection(USER_COLLECTION)
    .doc(userId)
    .collection(USER_DEVICE_COLLECTION)
    .withConverter(deviceConverter)
    .get();

  return snapshot.docs.map((document) => ({ token: document.id, platform: document.data().platform, userId }));
};

/** Every device in the database, read the way the daily fan-out reads them. */
const allDevices = async () => {
  const snapshot = await firestore.collectionGroup(USER_DEVICE_COLLECTION).withConverter(deviceConverter).get();

  return snapshot.docs.map((document) => ({
    token: document.id,
    platform: document.data().platform,
    userId: document.data().user_id,
  }));
};

const resolveUid = async () => {
  if (uid) {
    return uid;
  }

  const user = await getAuth().getUserByEmail(email).catch((error) => {
    if (error.code === 'auth/user-not-found') {
      die(`No user with email "${email}" in ${projectId}.`);
    }

    die(`Cannot reach ${projectId}: ${error.message}`);
  });

  console.log(`→ ${email} is ${user.uid}`);

  return user.uid;
};

const resolveDevices = async () => {
  if (tokens.length > 0) {
    // A token passed by hand is not looked up: the point of --token is to be
    // able to send to a phone whose document is missing, which is exactly the
    // bug one would be chasing.
    return tokens.map((token) => ({ token, platform: null, userId: null }));
  }

  return all ? allDevices() : devicesOfUser(await resolveUid());
};

const devices = await resolveDevices();
const malformed = devices.filter((device) => !isExpoPushToken(device.token));
const sendable = devices.filter((device) => isExpoPushToken(device.token));

if (devices.length === 0) {
  die(
    'No registered device.\n'
    + '  The app writes v1_users/{uid}/v1_user_devices at every launch of a signed-in session, so this means\n'
    + '  the app was never launched signed-in on a device, notifications were refused, or it ran on a simulator\n'
    + '  (a simulator never gets an Expo token — use a real phone).',
  );
}

for (const device of malformed) {
  console.error(`  ✖ ${device.token} — not an Expo push token, skipped (Expo would reject the whole batch)`);
}

if (sendable.length === 0) {
  die('Every token found is malformed — nothing to send.');
}

/** The day the notification points at, and the label the day's question was published under. */
const resolveDay = async () => {
  const dateKey = date ?? dailyQuestionDateKey(new Date());

  const month = await firestore
    .collection(DAILY_QUESTION_MONTH_COLLECTION)
    .doc(monthKeyOf(dateKey))
    .withConverter(dailyQuestionMonthConverter(Timestamp, GeoPoint))
    .get();

  return { dateKey, label: month.data()?.days?.[monthDayKeyOf(dateKey)]?.label ?? null };
};

const { dateKey, label } = await resolveDay();

if (label === null) {
  // Worth saying loudly: the notification will send and the tap will open a day
  // the app has nothing to show for, which reads as a broken tap listener.
  console.warn(`  ⚠ No question ran ${dateKey} — the tap will open a dead end.`);
  console.warn('    Seed it first: npm run seed-daily-questions -- --include-today');
}

const nudgeTitle = friends === 0 ? NUDGE_TITLE_ALONE : NUDGE_TITLE;

const message = {
  // Both notifications point at the same day and travel on the same channel —
  // only the lines differ, which is the whole of what there is to check here.
  title: title ?? (nudge ? nudgeTitle : NOTIFICATION_TITLE),
  body: body ?? (nudge ? nudgeBody(friends) : label ?? FALLBACK_BODY),
  data: { type: 'daily_question', date: dateKey },
  channelId: DAILY_QUESTION_CHANNEL_ID,
};

console.log(`→ ${dryRun ? 'Dry run on' : 'Sending on'} ${projectId}${emulator ? ` (tokens from emulator ${emulator})` : ''}`);
console.log(`  « ${message.title} »`);
console.log(`  « ${message.body} »`);
console.log(`  data: ${JSON.stringify(message.data)} · channel: ${message.channelId}`);

for (const device of sendable) {
  const owner = device.userId === null ? 'passed by hand' : device.userId;

  console.log(`  · ${device.token}${device.platform ? ` (${device.platform})` : ''} — ${owner}`);
}

if (dryRun) {
  console.log(`✔ Would notify ${sendable.length} device${sendable.length === 1 ? '' : 's'}. Nothing was sent — drop --dry-run to send.`);
  process.exit(0);
}

const authorizationHeaders = () => {
  const accessToken = process.env.EXPO_ACCESS_TOKEN;

  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

const postToExpo = async (endpoint, payload) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authorizationHeaders() },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    die(`Expo refused the request (${response.status} ${response.statusText}): ${await response.text()}`);
  }

  const { data, errors } = await response.json();

  if (errors) {
    die(`Expo answered an error: ${JSON.stringify(errors)}`);
  }

  return data;
};

const chunk = (items, size) => Array.from(
  { length: Math.ceil(items.length / size) },
  (_, index) => items.slice(index * size, index * size + size),
);

const tickets = [];

for (const batch of chunk(sendable, MESSAGES_PER_REQUEST)) {
  const answered = await postToExpo(EXPO_PUSH_ENDPOINT, batch.map((device) => ({ to: device.token, ...message })));

  if (answered.length !== batch.length) {
    die(`Expo answered ${answered.length} tickets for ${batch.length} messages — the alignment this script reports by is gone.`);
  }

  // Expo answers one ticket per message, in order: that index is the only thing
  // tying a rejection back to the token that caused it.
  tickets.push(...answered.map((ticket, index) => ({ device: batch[index], ticket })));
}

let queued = 0;

for (const { device, ticket } of tickets) {
  if (ticket.status === 'ok') {
    queued += 1;
    continue;
  }

  console.error(`  ✖ ${device.token} — ${ticket.message}${ticket.details?.error ? ` (${ticket.details.error})` : ''}`);

  if (ticket.details?.error === 'DeviceNotRegistered') {
    console.error('    That token is dead — the app was uninstalled or notifications turned off. The daily fan-out deletes these on its own.');
  }
}

console.log(`✔ Expo queued ${queued}/${tickets.length} message${tickets.length === 1 ? '' : 's'}.`);

if (queued === 0 || !receipts) {
  process.exit(queued === 0 ? 1 : 0);
}

// A ticket is an acceptance, not a delivery. This is the part the backend does
// not do yet (`helpers/expoPush.ts`), and the part a test is actually for.
console.log(`→ Waiting ${RECEIPTS_DELAY_MS / 1000}s for the receipts…`);
await new Promise((resolve) => setTimeout(resolve, RECEIPTS_DELAY_MS));

const ticketIds = tickets.filter(({ ticket }) => ticket.status === 'ok' && ticket.id).map(({ ticket }) => ticket.id);
const received = await postToExpo(EXPO_RECEIPTS_ENDPOINT, { ids: ticketIds });

let delivered = 0;
let pending = 0;

for (const id of ticketIds) {
  const receipt = received[id];

  if (!receipt) {
    // Expo has not turned this ticket into a receipt yet — normal, and not a
    // failure: it means "still in flight", not "lost".
    pending += 1;
    continue;
  }

  if (receipt.status === 'ok') {
    delivered += 1;
    continue;
  }

  console.error(`  ✖ ${id} — ${receipt.message}${receipt.details?.error ? ` (${receipt.details.error})` : ''}`);
}

console.log(`✔ ${delivered} delivered to APNs/FCM${pending > 0 ? `, ${pending} still in flight` : ''}.`);
console.log('  A delivered notification can still be silent on the phone: Do Not Disturb, the channel turned off in the system settings, or a build whose config plugin is missing.');
