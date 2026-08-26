#!/usr/bin/env node
//
// Fills a running emulator with a whole StatOwrel — an account to sign into, a
// month of daily questions behind it, friends who answered them, the streak and
// the calendar that follow from those answers.
//
// It exists because the emulator is now the dev environment (there is no second
// Firebase project — see docs/architecture.md), and an emulator that has just
// been reset opens on the sign-up screen of an empty app: no question today, an
// inert calendar, no friend to unlock the card of docs/prd.md §5.5. The three
// prod-facing seeds next to this one each fill one slice of that and stop where
// they must — none of them may forge an account or an answer under somebody's
// UID, because they are pointed at real projects. This one only ever talks to
// the emulator, so it can forge the lot.
//
//   npm run seed-emulator                       # wipe, then build the world
//   npm run seed-emulator -- --days 60 --friends 6
//   npm run seed-emulator -- --answer-today     # today already answered, card and all
//   npm run seed-emulator -- --dry-run          # says what it would write
//
// Sign in with `dev@statowrel.test` / `statowrel` (`--email`, `--password`).
// That account also carries the `admin` claim, so the same credentials open the
// moderation console — `npm run dev:admin`.
//
// **It wipes Firestore and Auth first, every time**, and there is no flag not
// to. The world it writes is one whole — the day's tally counts the answers it
// forged, each answer is already projected into its author's calendar, each
// streak is the replay of those answers — and layering a second run on top of a
// first leaves answers no calendar carries, which the answer trigger reads as an
// answer it has still to count. So: one run, one world, nothing kept.
//
// **The emulators have to be running**: `npm run dev:functions`. The script
// refuses to start otherwise rather than half-writing a world.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { GeoPoint, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { ulid } from 'ulid';

import { die, resolveProjectId } from './lib/firebase-project.mjs';
import {
  DEFAULT_SEED_FILE,
  DEMO_ANSWERS,
  DEMO_QUESTION,
  fabricateAnswerCounts,
  readSeedEntries,
  seedOptionsOf,
} from './lib/questions-seed.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const USAGE = 'Usage: npm run seed-emulator -- [--days <n>] [--friends <n>] [--crowd <n>] '
  + '[--email <e>] [--password <p>] [--answer-today] [--seed <n>] [--dry-run]';

/** A month of history: enough for the calendar to have a shape, short enough to stay readable. */
const DEFAULT_DAYS = 30;

/** Accepted friends of the main account — four lines in the card of docs/prd.md §4.5. */
const DEFAULT_FRIENDS = 4;

/**
 * Fabricated answers on each day's question, on top of the seeded accounts'
 * real ones. It is what the percentages of docs/prd.md §5.5 are computed from:
 * without a crowd the first pick reads « Comme 100% des gens… ».
 */
const DEFAULT_CROWD = 80;

const DEFAULT_EMAIL = 'dev@statowrel.test';
const DEFAULT_PASSWORD = 'statowrel';

/** Handle of the main account — `USERNAME_PATTERN`-shaped, like every one below. */
const MAIN_USERNAME = 'dev';

/** A year of history, past which this is no longer a fixture. */
const MAX_DAYS = 366;

/**
 * The accepted friends, in the order `--friends` takes them.
 *
 * Real handles rather than `friend1`…`friend4`: the friend list, the card and
 * the avatars all key off the username — the DiceBear patchwork of
 * `src/lib/avatars.ts` is seeded on it — so a cast of look-alike handles makes
 * four identical-looking lines.
 */
const CAST = [ 'camille', 'nadia', 'theo', 'lou', 'sacha', 'jules', 'manon', 'yanis' ];

/** Sends the main account an invitation — the `incoming` row of the Menu's friend list, « Accepter » / « Refuser ». */
const INVITER = 'bastien';

/** Invited by the main account and not having answered yet — the `outgoing` row, « Annuler ». */
const INVITEE = 'elsa';

/** Approved questions left in the pot, so the emulator's own 07:00 scheduler has something to draw tomorrow. */
const POT_APPROVED = 10;

/** Proposals waiting in the moderation console. */
const POT_PENDING = 8;

const POT_REJECTED = 2;

const REJECTION_REASON = 'Trop proche d’une question déjà posée.';

/** How often a seeded friend answers a given day. */
const FRIEND_ANSWER_RATE = 0.75;

/** How often a friend's answer is a catch-up, given after the day closed (docs/prd.md §4.2). */
const FRIEND_LATE_RATE = 0.08;

const parseArgs = (argv) => {
  const parsed = {
    days: DEFAULT_DAYS,
    friends: DEFAULT_FRIENDS,
    crowd: DEFAULT_CROWD,
    email: DEFAULT_EMAIL,
    password: DEFAULT_PASSWORD,
    answerToday: false,
    seed: 1,
    dryRun: false,
  };

  const readNumber = (value, flag) => {
    const number = Number(value);

    if (!Number.isInteger(number) || number < 0) {
      die(`${flag} needs a positive whole number (got "${value}").\n${USAGE}`);
    }

    return number;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--answer-today') {
      parsed.answerToday = true;
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--days') {
      parsed.days = readNumber(argv[i += 1], '--days');
    } else if (arg === '--friends') {
      parsed.friends = readNumber(argv[i += 1], '--friends');
    } else if (arg === '--crowd') {
      parsed.crowd = readNumber(argv[i += 1], '--crowd');
    } else if (arg === '--seed') {
      parsed.seed = readNumber(argv[i += 1], '--seed');
    } else if (arg === '--email') {
      parsed.email = argv[i += 1] ?? die(`--email needs an address.\n${USAGE}`);
    } else if (arg === '--password') {
      parsed.password = argv[i += 1] ?? die(`--password needs a value.\n${USAGE}`);
    } else if (arg === '--production' || arg === '--project') {
      // The one flag its siblings all take, and the one this script must never
      // honour: it forges accounts and answers under UIDs it makes up.
      die('seed-emulator only ever writes to the emulator — there is no --production and no --project.');
    } else {
      die(`Unknown flag "${arg}".\n${USAGE}`);
    }
  }

  if (parsed.days < 1) die(`--days needs at least one day.\n${USAGE}`);
  if (parsed.days > MAX_DAYS) die(`--days is capped at ${MAX_DAYS}.\n${USAGE}`);
  if (parsed.friends > CAST.length) die(`--friends is capped at ${CAST.length} — the cast has no more handles.\n${USAGE}`);
  if (parsed.password.length < 6) die('--password needs at least 6 characters — Firebase Auth refuses shorter ones.');

  return parsed;
};

const { days, friends: friendCount, crowd, email, password, answerToday, seed, dryRun } = parseArgs(process.argv.slice(2));

/**
 * Same run, same world.
 *
 * `Math.random` is replaced rather than threaded through every call: the
 * catalogue helpers next door (`fabricateAnswerCounts`, and `seedOptionsOf`
 * through `ulid`) reach for it on their own, and a fixture whose tallies move
 * on every run is one nobody can describe a bug against. `--seed` picks
 * another world.
 */
const mulberry32 = (a) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const random = mulberry32(seed);
Math.random = random;

const randomInt = (min, max) => min + Math.floor(random() * (max - min + 1));

const pickOne = (items) => items[Math.floor(random() * items.length)];

const shuffle = (items) => {
  const shuffled = [ ...items ];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));

    [ shuffled[i], shuffled[j] ] = [ shuffled[j], shuffled[i] ];
  }

  return shuffled;
};

// ---------------------------------------------------------------------------
// The emulator, and nothing but the emulator.
// ---------------------------------------------------------------------------

/**
 * The emulator ports, read from `firebase.json` rather than hardcoded — the
 * same reason `lib/firebase-project.mjs` reads the project ids from
 * `.firebaserc`: the day a port moves, a script that carried its own copy keeps
 * talking to nothing.
 */
const emulatorHosts = () => {
  let emulators;

  try {
    ({ emulators } = JSON.parse(readFileSync(resolve(REPO_ROOT, 'firebase.json'), 'utf-8')));
  } catch (error) {
    die(`Could not read firebase.json (${error.message}).`);
  }

  const hostOf = (name, fallbackPort) => {
    const port = emulators?.[name]?.port ?? fallbackPort;

    return `127.0.0.1:${port}`;
  };

  return { firestore: hostOf('firestore', 8080), auth: hostOf('auth', 9099) };
};

const hosts = emulatorHosts();

// Set before the Admin SDK is initialised — it reads them once, at that point.
// An explicit value already in the environment wins, so pointing the script at
// a differently-hosted emulator stays possible.
process.env.FIRESTORE_EMULATOR_HOST ??= hosts.firestore;
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= hosts.auth;

const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

// `singleProjectMode` is on in firebase.json, so the emulator holds one project
// and it is the `.firebaserc` default — the same id `firebase emulators:start`
// picked when it was started.
const projectId = resolveProjectId({ alias: 'default' });

/** Dies with the one instruction that fixes it, rather than on a socket error 40 lines down. */
const requireEmulator = async (name, host, path) => {
  const response = await fetch(`http://${host}${path}`, {
    headers: { Authorization: 'Bearer owner' },
  }).catch(() => null);

  if (response === null) {
    die(`No ${name} emulator answering on ${host}.\n  Start them first: npm run dev:functions`);
  }
};

await requireEmulator('Firestore', firestoreHost, '/');
await requireEmulator('Auth', authHost, '/');

const models = await import('@statowrel/models').catch((error) => die(
  `Could not load @statowrel/models (${error.message}).\nRun \`npm run build:models\` first.`,
));

const {
  closingTimeOf,
  DAILY_QUESTION_ANSWER_COLLECTION,
  DAILY_QUESTION_MONTH_COLLECTION,
  dailyQuestionAnswerConverter,
  dailyQuestionDateKey,
  dailyQuestionMonthConverter,
  DEMO_QUESTION_ID,
  monthDayKeyOf,
  monthKeyOf,
  parisTimeToInstant,
  previousDateKey,
  publicationTimeOf,
  QUESTION_COLLECTION,
  QUESTION_MAX_OPTIONS,
  QUESTION_MIN_OPTIONS,
  questionConverter,
  USER_CALENDAR_MONTH_COLLECTION,
  USER_COLLECTION,
  USER_FRIEND_COLLECTION,
  USERNAME_COLLECTION,
  userCalendarMonthConverter,
  userConverter,
  userFriendConverter,
  usernameConverter,
} = models;

initializeApp({ projectId });

const firestore = getFirestore();
const auth = getAuth();

const collection = (name, converter) => firestore.collection(name).withConverter(converter(Timestamp, GeoPoint));

const questionsRef = collection(QUESTION_COLLECTION, questionConverter);
const usersRef = collection(USER_COLLECTION, userConverter);
const usernamesRef = collection(USERNAME_COLLECTION, usernameConverter);
const monthsRef = collection(DAILY_QUESTION_MONTH_COLLECTION, dailyQuestionMonthConverter);

const subCollection = (parentRef, name, converter) => (
  parentRef.collection(name).withConverter(converter(Timestamp, GeoPoint))
);

/**
 * Writes queued up and committed 400 at a time — a Firestore batch caps at 500,
 * and a month of days times a cast of friends goes past it.
 */
const createWriter = () => {
  const queued = [];

  return {
    set: (ref, data, options) => queued.push({ ref, data, options }),
    size: () => queued.length,
    commit: async () => {
      for (let i = 0; i < queued.length; i += 400) {
        const batch = firestore.batch();

        for (const { ref, data, options } of queued.slice(i, i + 400)) {
          if (options) batch.set(ref, data, options);
          else batch.set(ref, data);
        }

        await batch.commit();
      }

      queued.length = 0;
    },
  };
};

// ---------------------------------------------------------------------------
// The world, decided in memory before a single document is written.
// ---------------------------------------------------------------------------

const now = new Date();
const nowIso = now.toISOString();
const today = dailyQuestionDateKey(now);

/** Oldest first, today last — the order the streak is replayed in. */
const dates = Array.from({ length: days }, (_, index) => previousDateKey(today, days - 1 - index));

const uidOf = (username) => `seed-${username}`;
const emailOf = (username) => (username === MAIN_USERNAME ? email : `${username}@statowrel.test`);

const friendUsernames = CAST.slice(0, friendCount);
const castUsernames = [ MAIN_USERNAME, ...friendUsernames, INVITER, INVITEE ];

/**
 * The instant an answer was given: some evening hour of its own day, and never
 * in the future — today's question has only been open since 07:00 Paris, so a
 * day still young has fewer answers on it than a day gone, which is exactly
 * what the app shows at that hour.
 *
 * Returns `null` when the day has not opened yet: before the 07:00 drop, nobody
 * has answered today, the seeded cast included.
 */
const answerInstantOf = (dateKey, { late }) => {
  if (late) {
    // A catch-up: past the day's own midnight, and stamped `late` for it.
    const closed = closingTimeOf(dateKey);
    const instant = new Date(closed.getTime() + randomInt(1, 20) * 60 * 60 * 1000);

    return instant > now ? null : instant;
  }

  const opened = publicationTimeOf(dateKey);
  const instant = parisTimeToInstant(dateKey, randomInt(8, 22), randomInt(0, 59));

  if (instant <= now) {
    return instant;
  }

  // Today, and the hour drawn has not come round yet: fall somewhere between
  // the drop and now instead.
  if (now <= opened) {
    return null;
  }

  return new Date(opened.getTime() + random() * (now.getTime() - opened.getTime()));
};

const entries = shuffle(readSeedEntries(DEFAULT_SEED_FILE, {
  minOptions: QUESTION_MIN_OPTIONS,
  maxOptions: QUESTION_MAX_OPTIONS,
}));

const needed = dates.length + POT_APPROVED + POT_PENDING + POT_REJECTED;

if (entries.length < needed) {
  die(`The catalogue holds ${entries.length} questions and this run needs ${needed} — lower --days.`);
}

// The days, in order: one question each, minted from the catalogue with its own
// ULID and its own option ULIDs, exactly the way the moderation console mints
// them as an option is typed in.
const world = dates.map((date) => {
  const entry = entries.shift();

  return {
    date,
    questionId: ulid(),
    label: entry.question.trim(),
    options: seedOptionsOf(entry),
    answers: [],
  };
});

/** Who answered what, day by day — decided before anything is written, because the projections depend on all of it. */
const mainAnswered = new Set();

// Two holes in the main account's history, so the calendar shows missed days
// and `streak_best` is something other than today's count. Never on the last
// few days: the trailing run is the streak the Stats screen leads with.
const holes = new Set(days >= 8 ? [ Math.floor(days * 0.25), Math.floor(days * 0.6) ] : []);

for (const [ index, day ] of world.entries()) {
  const isToday = day.date === today;

  // Today is left unanswered on purpose: a dev seed whose whole point is the
  // day's question must not have answered it already. `--answer-today` is for
  // when the result card is what one wants to look at.
  const mainAnswers = holes.has(index) ? false : (!isToday || answerToday);

  if (mainAnswers) {
    const instant = answerInstantOf(day.date, { late: false });

    if (instant !== null) {
      day.answers.push({ username: MAIN_USERNAME, option: pickOne(day.options), instant, late: false });
      mainAnswered.add(day.date);
    }
  }

  for (const username of friendUsernames) {
    if (random() > FRIEND_ANSWER_RATE) {
      continue;
    }

    const late = !isToday && random() < FRIEND_LATE_RATE;
    const instant = answerInstantOf(day.date, { late });

    if (instant !== null) {
      day.answers.push({ username, option: pickOne(day.options), instant, late });
    }
  }
}

// ---------------------------------------------------------------------------
// Writing it down.
// ---------------------------------------------------------------------------

const todaysDay = world.find((day) => day.date === today);
const answersTotal = world.reduce((total, day) => total + day.answers.length, 0);

console.log(`→ ${dryRun ? 'Dry run on' : 'Seeding'} the emulator (${projectId} · firestore ${firestoreHost} · auth ${authHost})`);
console.log(`  ${dates[0]} → ${dates[dates.length - 1]} · ${friendUsernames.length} friend(s) · ${answersTotal} answers · crowd of ${crowd} a day`);

if (dryRun) {
  console.log(`  today (${today}): « ${todaysDay?.label ?? '—'} »`);
  console.log(`  accounts: ${castUsernames.map((username) => emailOf(username)).join(', ')}`);
  console.log('✔ --dry-run: nothing was written.');
  process.exit(0);
}

// The emulator's own reset endpoints — the whole point of seeding against it
// rather than a project. The world below is written as one consistent whole, so
// it replaces the previous one rather than joining it: see the header.
const wipe = async (name, url) => {
  const response = await fetch(url, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });

  if (!response.ok) {
    die(`Could not clear the ${name} emulator (${response.status} ${response.statusText}).`);
  }
};

await wipe('Firestore', `http://${firestoreHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`);
await wipe('Auth', `http://${authHost}/emulator/v1/projects/${projectId}/accounts`);

console.log('  · wiped Firestore and Auth');

// --- Accounts --------------------------------------------------------------

for (const username of castUsernames) {
  const uid = uidOf(username);

  await auth.deleteUser(uid).catch(() => {});
  await auth.createUser({
    uid,
    email: emailOf(username),
    emailVerified: true,
    password,
    displayName: username,
  });

  // The main account moderates too, so one set of credentials opens both the
  // app and `npm run dev:admin`. `isAdmin()` in firestore.rules reads this claim.
  if (username === MAIN_USERNAME) {
    await auth.setCustomUserClaims(uid, { admin: true });
  }
}

console.log(`  · ${castUsernames.length} accounts in Auth (password: ${password})`);

// --- Profiles, handles, friendships ----------------------------------------

const writer = createWriter();

/** Counters and streak, replayed below over the answers each account gave. */
const profiles = new Map(castUsernames.map((username) => [ username, {
  answers_count: 0,
  streak_count: 0,
  streak_best: 0,
  streak_last_answered_on: null,
} ]));

/** Mirrors `apps/functions/src/domains/daily-questions/helpers/streak.ts` — an on-time answer only. */
const advanceStreak = (state, dateKey) => {
  if (state.streak_last_answered_on !== null && state.streak_last_answered_on >= dateKey) {
    return;
  }

  state.streak_count = state.streak_last_answered_on === previousDateKey(dateKey, 1) ? state.streak_count + 1 : 1;
  state.streak_best = Math.max(state.streak_best, state.streak_count);
  state.streak_last_answered_on = dateKey;
};

for (const day of world) {
  for (const answer of day.answers) {
    const profile = profiles.get(answer.username);

    profile.answers_count += 1;

    if (!answer.late) {
      advanceStreak(profile, day.date);
    }
  }
}

const createdAt = new Date(now.getTime() - (days + 1) * 24 * 60 * 60 * 1000).toISOString();

for (const username of castUsernames) {
  const profile = profiles.get(username);

  writer.set(usersRef.doc(uidOf(username)), {
    username,
    email: emailOf(username),
    auth_providers: [ 'password' ],
    created_at: createdAt,
    updated_at: nowIso,
    ...profile,
  });

  writer.set(usernamesRef.doc(username), { user_id: uidOf(username), created_at: createdAt });
}

/** Both halves of a friendship, mirrored the way `friends-inviteFriend` writes them. */
const writeFriendship = ({ requestedBy, other, status, createdOn }) => {
  const acceptedAt = status === 'accepted' ? createdOn : null;

  for (const [ owner, friend ] of [ [ requestedBy, other ], [ other, requestedBy ] ]) {
    writer.set(
      subCollection(usersRef.doc(uidOf(owner)), USER_FRIEND_COLLECTION, userFriendConverter).doc(uidOf(friend)),
      {
        user_id: uidOf(owner),
        friend_id: uidOf(friend),
        friend_username: friend,
        status,
        requested_by: uidOf(requestedBy),
        created_at: createdOn,
        accepted_at: acceptedAt,
      },
    );
  }
};

for (const username of friendUsernames) {
  writeFriendship({ requestedBy: MAIN_USERNAME, other: username, status: 'accepted', createdOn: createdAt });
}

// One invitation received and one sent, so the Menu's friend list and the Stats
// screen's invitation card both have their row (docs/prd.md §5.3).
writeFriendship({ requestedBy: INVITER, other: MAIN_USERNAME, status: 'pending', createdOn: nowIso });
writeFriendship({ requestedBy: MAIN_USERNAME, other: INVITEE, status: 'pending', createdOn: nowIso });

// --- Questions and the days they ran ---------------------------------------

/** The tally a question carries: a fabricated crowd, plus the answers actually written under it. */
const answerCountsOf = (day) => {
  const counts = fabricateAnswerCounts(day.options, crowd) ?? Object.fromEntries(day.options.map((o) => [ o.id, 0 ]));

  for (const answer of day.answers) {
    counts[answer.option.id] = (counts[answer.option.id] ?? 0) + 1;
  }

  return counts;
};

for (const day of world) {
  const publishedAt = publicationTimeOf(day.date).toISOString();

  writer.set(questionsRef.doc(day.questionId), {
    label: day.label,
    options: day.options,
    status: 'used',
    // A third of them credited to a friend, so the day screen's credit line is
    // exercised — the rest have nobody to credit, like a seeded catalogue entry.
    author_id: random() < 0.33 && friendUsernames.length > 0 ? uidOf(pickOne(friendUsernames)) : '',
    rejection_reason: null,
    broadcast_at: publishedAt,
    broadcast_on: day.date,
    closes_at: closingTimeOf(day.date).toISOString(),
    answer_counts: answerCountsOf(day),
    created_at: createdAt,
  });
}

/** What is left in the pot: what tomorrow's draw picks from, and what the moderation console opens on. */
const potOf = (status, count) => Array.from({ length: count }, () => {
  const entry = entries.shift();

  return { entry, status };
});

const pot = [
  ...potOf('approved', POT_APPROVED),
  ...potOf('pending', POT_PENDING),
  ...potOf('rejected', POT_REJECTED),
];

for (const { entry, status } of pot) {
  writer.set(questionsRef.doc(ulid()), {
    label: entry.question.trim(),
    options: seedOptionsOf(entry),
    status,
    // A proposal comes from somebody; an approved question waiting to be drawn
    // may as well too.
    author_id: uidOf(pickOne(castUsernames)),
    rejection_reason: status === 'rejected' ? REJECTION_REASON : null,
    broadcast_at: null,
    broadcast_on: null,
    closes_at: null,
    answer_counts: {},
    created_at: nowIso,
  });
}

// The onboarding carousel's sample question (docs/prd.md §5.6). Seeded here
// rather than left to `npm run seed-demo-question` because the wipe above takes
// it with everything else: an emulator seeded without it opens the carousel on
// a question that cannot be read, which is the one screen a first launch is
// guaranteed to reach.
{
  const options = DEMO_QUESTION.options.map((option) => ({ id: ulid(), ...option }));

  writer.set(questionsRef.doc(DEMO_QUESTION_ID), {
    label: DEMO_QUESTION.label,
    options,
    status: 'demo',
    author_id: '',
    rejection_reason: null,
    // A demo is never a day: everything the daily cycle owns stays null.
    broadcast_at: null,
    broadcast_on: null,
    closes_at: null,
    answer_counts: fabricateAnswerCounts(options, DEMO_ANSWERS) ?? {},
    created_at: createdAt,
  });
}

// `v1_daily_question_months` is the only thing mapping a calendar day to its
// question — one document a month, each day an entry in it.
const monthDays = new Map();

for (const day of world) {
  const monthKey = monthKeyOf(day.date);

  if (!monthDays.has(monthKey)) {
    monthDays.set(monthKey, {});
  }

  monthDays.get(monthKey)[monthDayKeyOf(day.date)] = { question_id: day.questionId, label: day.label };
}

for (const [ monthKey, monthDaysMap ] of monthDays) {
  writer.set(monthsRef.doc(monthKey), { month: monthKey, days: monthDaysMap, updated_at: nowIso });
}

// --- The read models the answers project into -------------------------------

/**
 * `v1_user_calendar_months`, built here rather than left to the answer trigger.
 *
 * Not a shortcut — a correctness requirement, and the reason the answers are
 * the very last thing written. The trigger is running in the emulator too, and
 * its idempotency marker is exactly this: a day already in the author's month
 * means the answer was already applied, so it bails out before incrementing
 * anything. Writing the projection first is what keeps a seeded tally from
 * being counted a second time — and keeps the fixture identical whether the
 * functions emulator happens to be up or not.
 */
const calendars = new Map();

const calendarOf = (username, monthKey) => {
  const key = `${username}/${monthKey}`;

  if (!calendars.has(key)) {
    calendars.set(key, { username, monthKey, days: {}, friendCounts: {} });
  }

  return calendars.get(key);
};

for (const day of world) {
  const monthKey = monthKeyOf(day.date);
  const monthDayKey = monthDayKeyOf(day.date);

  for (const answer of day.answers) {
    calendarOf(answer.username, monthKey).days[monthDayKey] = {
      option_id: answer.option.id,
      stat_label: answer.option.stat_label,
      late: answer.late,
    };
  }

  // The badge of docs/prd.md §5.2: how many of one's accepted friends answered
  // that day. The friendships seeded above are all main ↔ cast, so a friend's
  // answer counts onto the main account and the main account's counts onto each
  // friend — which is what the trigger's fan-out does.
  const answeredBy = new Set(day.answers.map((answer) => answer.username));
  const friendsAnswered = friendUsernames.filter((username) => answeredBy.has(username)).length;

  if (friendsAnswered > 0) {
    calendarOf(MAIN_USERNAME, monthKey).friendCounts[monthDayKey] = friendsAnswered;
  }

  if (answeredBy.has(MAIN_USERNAME)) {
    for (const username of friendUsernames) {
      calendarOf(username, monthKey).friendCounts[monthDayKey] = 1;
    }
  }
}

for (const { username, monthKey, days: answeredDays, friendCounts } of calendars.values()) {
  writer.set(
    subCollection(usersRef.doc(uidOf(username)), USER_CALENDAR_MONTH_COLLECTION, userCalendarMonthConverter).doc(monthKey),
    { month: monthKey, days: answeredDays, friend_answer_counts: friendCounts, updated_at: nowIso },
  );
}

await writer.commit();

console.log(`  · ${world.length} days, ${pot.length} questions left in the pot, 1 demo, ${calendars.size} calendar months`);

// --- The answers, last ------------------------------------------------------

const answersWriter = createWriter();

for (const day of world) {
  const questionRef = questionsRef.doc(day.questionId);

  for (const answer of day.answers) {
    answersWriter.set(
      subCollection(questionRef, DAILY_QUESTION_ANSWER_COLLECTION, dailyQuestionAnswerConverter).doc(uidOf(answer.username)),
      {
        user_id: uidOf(answer.username),
        question_id: day.questionId,
        date: day.date,
        option_id: answer.option.id,
        answered_at: answer.instant.toISOString(),
        late: answer.late,
        // Stamped, like every answer the trigger has been through: the tally
        // and the calendars written above already carry this answer, and
        // `counted_at` is what says so — the day screen reads it to know
        // whether it has to fold its own answer into the percentages it shows.
        counted_at: answer.instant.toISOString(),
      },
    );
  }
}

await answersWriter.commit();

console.log(`  · ${answersTotal} answers`);

// --- What is now there ------------------------------------------------------

const main = profiles.get(MAIN_USERNAME);
const todayAnswered = mainAnswered.has(today);

console.log('');
console.log('✔ The emulator holds a StatOwrel.');
console.log('');
console.log(`  Sign in     ${email} / ${password}${' '.repeat(2)}(also admin — npm run dev:admin)`);
console.log(`  Today       ${today} · « ${todaysDay?.label ?? '—'} »`);
console.log(`  Answered    ${todayAnswered ? 'yes — the sheet opens on the result card' : 'no — the day is yours to answer'}`);
console.log(`  Streak      ${main.streak_count} day(s), best ${main.streak_best}, ${main.answers_count} answered`);
console.log(`  Friends     ${friendUsernames.join(', ') || '—'} · 1 invitation from ${INVITER} · 1 sent to ${INVITEE}`);
console.log(`  Moderation  ${POT_PENDING} pending, ${POT_APPROVED} approved, ${POT_REJECTED} rejected`);
console.log(`  Onboarding  the demo question is in, with ${DEMO_ANSWERS} answers behind it`);

if (now < publicationTimeOf(today)) {
  console.log('');
  console.log(`  ⚠ It is not 07:00 Paris yet, so today's question is stamped in the future and the app`);
  console.log(`    reads it as unpublished — same as production. Run again after 07:00, or look at ${dates[dates.length - 2]}.`);
}
