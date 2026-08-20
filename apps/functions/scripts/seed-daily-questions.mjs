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
//   - each seeded day gets a plausible `answer_counts` tally, so the card of
//     docs/prd.md §5.5 reads « Comme 23% des gens… » instead of putting the
//     first answer at 100%. Those are counters only: no answer document is
//     forged under anybody's UID, and a real answer keeps incrementing them.
//
// When the approved pot runs short, the missing days are minted from the
// built-in catalogue below (labels already in Firestore are never minted
// twice), so the script is useful on a project where nothing was moderated yet.
//
//   npm run seed-daily-questions                                   # the 5 days before today
//   npm run seed-daily-questions -- --days 10 --include-today
//   npm run seed-daily-questions -- --answers 0                    # no tally, days left at zero
//   npm run seed-daily-questions -- --author <uid>                 # credit the questions to an account
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

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { GeoPoint, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { ulid } from 'ulid';

import { die, resolveProjectId } from './lib/firebase-project.mjs';

const USAGE = `Usage: npm run seed-daily-questions -- [--days <n>] [--include-today] [--answers <n>] [--author <uid>] [--production | --project <id>] [--dry-run]`;

/** Days seeded when `--days` is not given — the week one just missed, roughly. */
const DEFAULT_DAYS = 5;

/** Answers a seeded day is given, spread over its options. `--answers 0` leaves the day at zero. */
const DEFAULT_ANSWERS = 120;

/**
 * Author credited on a minted question when `--author` is not given. It is a
 * UID that matches no `v1_users` document, which the day screen renders as no
 * credit line at all — rather than crediting a real user with a fixture.
 */
const DEFAULT_AUTHOR_ID = 'seed-script';

/**
 * The pot the script mints from when moderation has not filled the real one —
 * docs/prd.md §1, same register: personal, absurd, never moralising. One
 * StatOwrel per option, since that is what the result card is made of.
 */
const CATALOGUE = [
  [ 'Ton dentifrice, tu le presses…', [
    [ 'Par le bout', 'méthodique' ],
    [ 'Au milieu', 'sauvage' ],
    [ "Je l'écrase n'importe comment", 'anarchiste' ],
  ] ],
  [ 'Caca : combien de temps ?', [
    [ 'Moins de 2 min', 'efficace' ],
    [ 'Plus de 10 min', 'résident.e' ],
  ] ],
  [ 'Tes plantes ?', [
    [ 'Je les arrose', 'arroseur.euse' ],
    [ 'Je les tue', 'killer.euse' ],
  ] ],
  [ 'Ta serviette après la douche ?', [
    [ 'Sur le radiateur', 'rangé.e' ],
    [ 'Sur la porte', 'pragmatique' ],
    [ 'Par terre', 'libre' ],
    [ "Je n'en ai qu'une, partout", 'survivaliste' ],
  ] ],
  [ 'Ton réveil du matin ?', [
    [ 'Un seul, je me lève', 'machine' ],
    [ 'Snooze trois fois', 'négociateur.rice' ],
    [ 'Douze alarmes de 6h à 7h30', 'stratège' ],
  ] ],
  [ 'La vaisselle du soir ?', [
    [ 'Direct après manger', 'irréprochable' ],
    [ 'Demain matin', 'optimiste' ],
    [ "Quand il n'y a plus d'assiette", 'joueur.euse' ],
  ] ],
  [ 'Ton téléphone, la nuit ?', [
    [ 'Dans une autre pièce', 'sage' ],
    [ 'Sur la table de nuit', 'normal.e' ],
    [ 'Dans le lit, sur ma tête', 'accro' ],
  ] ],
  [ 'Les messages vocaux ?', [
    [ "J'adore, j'en envoie des longs", 'bavard.e' ],
    [ "J'écoute en accéléré", 'pressé.e' ],
    [ 'Je ne les écoute jamais', 'fantôme' ],
  ] ],
  [ 'Le pain de mie, tu manges la croûte ?', [
    [ 'Évidemment', 'entier.ère' ],
    [ 'Jamais', 'délicat.e' ],
  ] ],
  [ 'Ton frigo ?', [
    [ 'Rangé par catégories', 'archiviste' ],
    [ 'Un peu au hasard', 'humain.e' ],
    [ 'Une expérience scientifique', 'chercheur.euse' ],
  ] ],
  [ 'Quand tu regardes une série ?', [
    [ 'Un épisode par soir', 'raisonnable' ],
    [ 'La saison entière', 'insatiable' ],
    [ "Je m'endors au générique", 'dormeur.euse' ],
  ] ],
  [ 'Tes chaussettes propres ?', [
    [ 'Pliées par paires', 'appairé.e' ],
    [ 'En vrac dans le tiroir', 'pêcheur.euse' ],
    [ 'Encore dans le panier de linge', 'nomade' ],
  ] ],
  [ 'Le papier toilette, le sens du rouleau ?', [
    [ 'Vers le mur', 'discret.ète' ],
    [ 'Vers toi', 'orthodoxe' ],
    [ 'Posé sur le réservoir', 'chaotique' ],
  ] ],
  [ 'Tu arrives au cinéma…', [
    [ 'Avant les pubs', 'prévoyant.e' ],
    [ 'Pile au film', 'précis.e' ],
    [ 'Après le début', 'tardif.ve' ],
  ] ],
];

const parseArgs = (argv) => {
  const parsed = {
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
    } else {
      die(`Unknown argument "${arg}".\n${USAGE}`);
    }
  }

  if (parsed.days < 1) die(`--days needs at least one day.\n${USAGE}`);
  if (parsed.days > CATALOGUE.length * 4) die(`--days is capped at ${CATALOGUE.length * 4} — seed a smaller window.\n${USAGE}`);

  return parsed;
};

const { days, includeToday, answers, author, dryRun, ...selector } = parseArgs(process.argv.slice(2));
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
  questionConverter,
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

/**
 * A plausible tally over a question's options, totalling `answers`.
 *
 * Every option gets at least one answer — an option at 0% reads as a bug on the
 * result card — and the rest is split on random weights, so the days do not all
 * come out of the seeding with the same shape. `--answers 0` returns `null`:
 * the day keeps the empty map the model starts with.
 */
const buildAnswerCounts = (options) => {
  if (answers === 0) {
    return null;
  }

  const weights = options.map(() => 0.2 + Math.random());
  const total = weights.reduce((acc, weight) => acc + weight, 0);
  let left = Math.max(answers - options.length, 0);

  return options.reduce((counts, option, index) => {
    const extra = index === options.length - 1
      ? left
      : Math.min(left, Math.round((weights[index] / total) * Math.max(answers - options.length, 0)));

    left -= extra;

    return { ...counts, [option.id]: 1 + extra };
  }, {});
};

/** A catalogue entry turned into the options a question carries — one ULID per option, minted once. */
const buildOptions = (options) => options.map(([ label, statLabel ]) => ({
  id: ulid(),
  label,
  stat_label: statLabel,
}));

const seedDay = async (date, pick) => {
  const publishedAt = publicationTimeOf(date);
  const question = pick();

  if (question === null) {
    return null;
  }

  const counts = buildAnswerCounts(question.options);

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
const knownLabels = new Set(pot.docs.map((document) => document.data().label));
const mintable = CATALOGUE.filter(([ label ]) => !knownLabels.has(label));

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

  const [ label, options ] = entry;

  return { id: ulid(), ref: null, label, options: buildOptions(options), answer_counts: {} };
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
    console.error(`  ✖ ${date} — no approved question left, and the catalogue is exhausted`);
    break;
  }

  const origin = question.ref === null ? 'minted' : 'drawn from the approved pot';
  console.log(`  ✔ ${date} — « ${question.label} » (${origin}${answers === 0 ? '' : `, ${answers} answers`})`);
  seeded += 1;
}

console.log(`✔ ${dryRun ? 'Would seed' : 'Seeded'} ${seeded} day${seeded === 1 ? '' : 's'}${kept > 0 ? `, ${kept} left alone` : ''}.`);

if (uncovered > 0) {
  console.log(`  ${uncovered} day${uncovered === 1 ? '' : 's'} left without a question — approve more of them in the console before running this again.`);
}

if (dryRun) {
  console.log('  Nothing was written — drop --dry-run to commit.');
}
