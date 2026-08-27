#!/usr/bin/env node
//
// Backfills the daily question of the days already gone, so a fresh project —
// or a freshly reset emulator — does not open on an empty calendar.
//
// It replays exactly what `scheduleDailyQuestion` commits every morning at
// 07:00 Paris, but for past days: draw an approved question, stamp its
// broadcast (`status`, `broadcast_at`, `broadcast_on`, `closes_at`) and index
// it in `v1_daily_question_months`, which is the only thing that maps a
// calendar day to its question. Two differences with the scheduler:
//
//   - nobody is notified — the publication push belongs to the day it drops;
//   - `--answers <n>` fabricates a tally on the days it seeds, so the card of
//     docs/prd.md §5.5 reads « Comme 23% des gens… » instead of putting the
//     first answer at 100% on a database nobody else has answered in. Off by
//     default: a seeded day otherwise carries only true data. Those are
//     counters on the question and nothing else — no answer document is forged
//     under anybody's UID, and a real answer keeps incrementing them.
//
// When the approved pot runs short, the missing days are minted straight from
// `scripts/questions.seed.json` — the same catalogue `npm run seed-questions`
// fills the moderation pot with, and a question already in Firestore is never
// minted twice — so the script is useful on a project where nothing has been
// moderated yet.
//
//   npm run seed-daily-questions                                   # the 5 days before today
//   npm run seed-daily-questions -- --days 10 --include-today
//   npm run seed-daily-questions -- --answers 120                  # fabricate a tally on each seeded day
//   npm run seed-daily-questions -- --author <uid>                 # credit the minted questions to an account
//   npm run seed-daily-questions -- ./other-questions.json         # mint from another catalogue
//   npm run seed-daily-questions -- --dry-run
//   npm run seed-daily-questions -- --production
//   npm run seed-daily-questions -- --project <id>
//
// Against the emulator, point it at the local Firestore instead of ADC:
//   FIRESTORE_EMULATOR_HOST=localhost:8080 npm run seed-daily-questions
//
// Authenticates with Application Default Credentials:
//   gcloud auth application-default login
//
// A day already indexed in its month is left alone, so the script can be run
// again — it only ever fills the holes.

import { resolve } from 'node:path';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { GeoPoint, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { ulid } from 'ulid';

import { die, resolveProjectId } from './lib/firebase-project.mjs';
import {
  DEFAULT_SEED_FILE,
  fabricateAnswerCounts,
  labelKeyOf,
  readSeedEntries,
  seedOptionsOf,
} from './lib/questions-seed.mjs';

const USAGE = `Usage: npm run seed-daily-questions -- [file.json] [--days <n>] [--include-today] [--answers <n>] [--author <uid>] [--production | --project <id>] [--dry-run]`;

/** Days seeded when `--days` is not given — the week one just missed, roughly. */
const DEFAULT_DAYS = 5;

/**
 * Fabricated answers per seeded day, spread over its options — none unless
 * `--answers <n>` asks for them, so what the script writes stays true by default.
 */
const DEFAULT_ANSWERS = 0;

/** A year of backfill, past which this is no longer seeding but rewriting history. */
const MAX_DAYS = 366;

/**
 * Author credited on a minted question when `--author` is not given — blank,
 * like `seed-questions`: a question typed into a fixture has nobody to credit,
 * and the day screen leaves the credit line out on an empty `author_id`.
 */
const DEFAULT_AUTHOR_ID = '';

const parseArgs = (argv) => {
  const parsed = {
    file: null,
    days: DEFAULT_DAYS,
    includeToday: false,
    answers: DEFAULT_ANSWERS,
    author: DEFAULT_AUTHOR_ID,
    project: null,
    alias: 'default',
    dryRun: false,
  };

  const readNumber = (value, flag) => {
    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue) || parsedValue < 0) {
      die(`${flag} needs a positive whole number (got "${value}").\n${USAGE}`);
    }

    return parsedValue;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--include-today') {
      parsed.includeToday = true;
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--production') {
      parsed.alias = 'production';
    } else if (arg === '--days') {
      parsed.days = readNumber(argv[i += 1], '--days');
    } else if (arg === '--answers') {
      parsed.answers = readNumber(argv[i += 1], '--answers');
    } else if (arg === '--author') {
      parsed.author = argv[i += 1] ?? die(`--author needs a UID.\n${USAGE}`);
    } else if (arg === '--project') {
      parsed.project = argv[i += 1] ?? die(`--project needs a project id.\n${USAGE}`);
    } else if (arg.startsWith('-')) {
      die(`Unknown flag "${arg}".\n${USAGE}`);
    } else if (parsed.file) {
      die(`Only one catalogue at a time (got "${parsed.file}" and "${arg}").\n${USAGE}`);
    } else {
      parsed.file = resolve(process.cwd(), arg);
    }
  }

  if (parsed.days < 1) die(`--days needs at least one day.\n${USAGE}`);
  if (parsed.days > MAX_DAYS) die(`--days is capped at ${MAX_DAYS} — seed a smaller window.\n${USAGE}`);

  return { ...parsed, file: parsed.file ?? DEFAULT_SEED_FILE };
};

const { file, days, includeToday, answers, author, dryRun, ...selector } = parseArgs(process.argv.slice(2));
const projectId = resolveProjectId(selector);
const emulator = process.env.FIRESTORE_EMULATOR_HOST;

// The models package is TypeScript compiled to dist/, which a plain .mjs cannot
// read — the npm script builds it first, so this only fails when the script is
// run by hand from a workspace that never built it.
const {
  closingTimeOf,
  DAILY_QUESTION_MONTH_COLLECTION,
  dailyQuestionDateKey,
  dailyQuestionMonthConverter,
  monthDayKeyOf,
  monthKeyOf,
  previousDateKey,
  publicationTimeOf,
  QUESTION_COLLECTION,
  QUESTION_MAX_OPTIONS,
  QUESTION_MIN_OPTIONS,
  questionConverter,
  USER_COLLECTION,
} = await import('@statowrel/models').catch(() => (
  die('Could not load @statowrel/models — run `npm run build:models` first.')
));

initializeApp({
  projectId,
  // The emulator accepts any credential; ADC may not even be configured.
  ...(emulator ? {} : { credential: applicationDefault() }),
});

const firestore = getFirestore();

const questionsRef = firestore
  .collection(QUESTION_COLLECTION)
  .withConverter(questionConverter(Timestamp, GeoPoint));

// The credit is carried on the question rather than resolved at display time,
// so it is resolved once here — `--author` being a single uid. An unknown one
// credits nobody: the fixture is still worth writing, and the reader falls back
// to the profile until the backfill passes.
const authorUsername = author === ''
  ? null
  : await firestore.collection(USER_COLLECTION).doc(author).get()
    .then((snapshot) => snapshot.data()?.username ?? null)
    .catch((error) => die(`Cannot read ${USER_COLLECTION}/${author} on ${projectId}: ${error.message}`));

const monthRefOf = (date) => firestore
  .collection(DAILY_QUESTION_MONTH_COLLECTION)
  .doc(monthKeyOf(date))
  .withConverter(dailyQuestionMonthConverter(Timestamp, GeoPoint));

/** The days to fill, oldest first — the `days` days before today, today included only on demand. */
const dateKeysToSeed = () => {
  const today = dailyQuestionDateKey(new Date());
  const oldest = includeToday ? days - 1 : days;

  return Array.from({ length: days }, (_, index) => previousDateKey(today, oldest - index));
};

/** Fisher-Yates, so the pot is drawn from uniformly — same intent as `drawApprovedQuestion`. */
const shuffle = (items) => {
  const shuffled = [ ...items ];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));

    [ shuffled[i], shuffled[j] ] = [ shuffled[j], shuffled[i] ];
  }

  return shuffled;
};

const seedDay = async (date, pick) => {
  const publishedAt = publicationTimeOf(date);
  const question = pick();

  if (question === null) {
    return null;
  }

  const counts = fabricateAnswerCounts(question.options, answers);

  if (dryRun) {
    return question;
  }

  const batch = firestore.batch();

  if (question.ref === null) {
    // A minted question is written through the converter, which is what turns
    // the ISO strings below into Timestamps.
    batch.set(questionsRef.doc(question.id), {
      label: question.label,
      options: question.options,
      status: 'used',
      author_id: author,
      author_username: authorUsername,
      rejection_reason: null,
      broadcast_at: publishedAt.toISOString(),
      broadcast_on: date,
      closes_at: closingTimeOf(date).toISOString(),
      answer_counts: counts ?? {},
      created_at: publishedAt.toISOString(),
    });
  } else {
    // An already approved question is stamped the way the scheduler stamps it:
    // `update()` does not run the converter (see the repo's CLAUDE.md), so
    // these are Timestamps and not ISO strings. `answer_counts` is only seeded
    // when the question has none — a real tally is never overwritten.
    batch.update(question.ref, {
      status: 'used',
      broadcast_at: Timestamp.fromDate(publishedAt),
      broadcast_on: date,
      closes_at: Timestamp.fromDate(closingTimeOf(date)),
      ...(counts && Object.keys(question.answer_counts ?? {}).length === 0 ? { answer_counts: counts } : {}),
    });
  }

  // `merge` deep-merges maps, so this adds one day to the month rather than
  // replacing the days already in it.
  batch.set(monthRefOf(date), {
    month: monthKeyOf(date),
    days: { [monthDayKeyOf(date)]: { question_id: question.id, label: question.label } },
    updated_at: publishedAt.toISOString(),
  }, { merge: true });

  await batch.commit();

  return question;
};

const dates = dateKeysToSeed();

// One read of the whole pot, rather than one query a day: the collection is
// human-moderated content, a few hundred documents at most.
const pot = await questionsRef.get();
const drawable = shuffle(pot.docs.filter((document) => document.data().status === 'approved'))
  .map((document) => ({ id: document.id, ref: document.ref, ...document.data() }));

// Minting is keyed on the label alone, where `seed-questions` keys on the label
// *and* its options: the catalogue poses several variants of the same question
// (« Tu prends ta douche… »), and a calendar week showing the same wording twice
// reads as a bug. So a question already in the pot is never minted again,
// whatever its status, and the first variant of a label wins the run.
const mintedLabels = new Set(pot.docs.map((document) => labelKeyOf(document.data().label ?? '')));
const mintable = readSeedEntries(file, { minOptions: QUESTION_MIN_OPTIONS, maxOptions: QUESTION_MAX_OPTIONS })
  .filter((entry) => {
    const key = labelKeyOf(entry.question);

    if (mintedLabels.has(key)) {
      return false;
    }

    mintedLabels.add(key);

    return true;
  });

// The months the seeded days fall in, read once: a day already indexed in its
// month has already been broadcast, and is left exactly as it is.
const seededMonths = new Map(await Promise.all([ ...new Set(dates.map(monthKeyOf)) ].map(async (month) => {
  const document = await monthRefOf(`${month}-01`).get();

  return [ month, new Set(Object.keys(document.data()?.days ?? {})) ];
})));

/** Draws the question a day runs: the moderated pot first, the catalogue for what it cannot cover. */
const pickQuestion = () => {
  const approved = drawable.shift();

  if (approved) {
    return approved;
  }

  const entry = mintable.shift();

  if (!entry) {
    return null;
  }

  return {
    id: ulid(),
    ref: null,
    label: entry.question.trim(),
    options: seedOptionsOf(entry),
    answer_counts: {},
  };
};

console.log(`→ ${dryRun ? 'Dry run on' : 'Seeding'} ${projectId}${emulator ? ` (emulator ${emulator})` : ''}: ${dates[0]} → ${dates[dates.length - 1]}`);

let seeded = 0;
let kept = 0;
let uncovered = 0;

for (const [ index, date ] of dates.entries()) {
  if (seededMonths.get(monthKeyOf(date))?.has(monthDayKeyOf(date))) {
    console.log(`  · ${date} — already has a question, left alone`);
    kept += 1;
    continue;
  }

  const question = await seedDay(date, pickQuestion);

  // Nothing approved and nothing left to mint: every remaining day would say
  // the same thing, so it is said once and the run stops there.
  if (question === null) {
    uncovered = dates.slice(index).filter((day) => !seededMonths.get(monthKeyOf(day))?.has(monthDayKeyOf(day))).length;
    console.error(`  ✖ ${date} — no approved question left, and every question of the catalogue is already in the pot`);
    break;
  }

  const origin = question.ref === null ? 'minted' : 'drawn from the approved pot';
  console.log(`  ✔ ${date} — « ${question.label} » (${origin}${answers === 0 ? '' : `, ${answers} answers`})`);
  seeded += 1;
}

console.log(`✔ ${dryRun ? 'Would seed' : 'Seeded'} ${seeded} day${seeded === 1 ? '' : 's'}${kept > 0 ? `, ${kept} left alone` : ''}.`);

if (uncovered > 0) {
  console.log(`  ${uncovered} day${uncovered === 1 ? '' : 's'} left without a question — approve more of them in the console (or \`npm run seed-questions -- --status approved\`) and run this again.`);
}

if (dryRun) {
  console.log('  Nothing was written — drop --dry-run to commit.');
}
