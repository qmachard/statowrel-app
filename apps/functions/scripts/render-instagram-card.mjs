#!/usr/bin/env node
//
// Renders the three slides of the morning Instagram post to disk, so the card can
// be judged by eye before anything is able to publish it.
//
//   npm run render-instagram-card                          # yesterday, default project
//   npm run render-instagram-card -- --date 2026-08-19
//   npm run render-instagram-card -- --production --out ./preview
//   npm run render-instagram-card -- --sample              # canned days, no Firestore at all
//
// It renders through the **same code** the scheduler will: `scripts/lib/load-src.mjs`
// bundles `src/domains/instagram/index.ts` with the deploy build's own esbuild
// settings and requires it. There is no second implementation to drift, which
// is the whole reason this script exists rather than a duplicated one.
//
// `--sample` is the flag to reach for while iterating on the design: it draws
// canned days at 2, 4 and 6 options — the bounds `QUESTION_MIN_OPTIONS` and
// `QUESTION_MAX_OPTIONS` set — with a long question and a long StatOwrel, which
// is the layout's worst case and the one a real database rarely offers on the
// day you need it. It touches no project and needs no credentials.
//
// A real run authenticates with Application Default Credentials
// (`gcloud auth application-default login`), or reads the emulator when
// `FIRESTORE_EMULATOR_HOST` is set — which is the way to see the card on real
// data without touching the project:
//
//   npm run dev:functions                     # or: firebase emulators:start --only firestore,auth
//   npm run seed-emulator -- --days 8 --crowd 400
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8082 npm run render-instagram-card -- --date <a seeded day>
//
// It only ever reads.
//
import { basename, resolve } from 'node:path';
import fs from 'node:fs/promises';

import { applicationDefault } from 'firebase-admin/app';

import { die, resolveProjectId } from './lib/firebase-project.mjs';
import { loadFromSrc } from './lib/load-src.mjs';

const USAGE = 'Usage: npm run render-instagram-card -- [--date YYYY-MM-DD] [--out <dir>] '
  + '[--sample] [--production | --project <id>]';

const DEFAULT_OUT_DIR = resolve(import.meta.dirname, '../.instagram-preview');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The Paris day before today.
 *
 * The post is about a **closed** day: the question stops taking answers at
 * Paris midnight, so yesterday is the most recent day whose percentages are
 * final. Same `en-CA` trick as `dailyQuestionDateKey` in `@statowrel/models` —
 * it is the locale whose short format is already `YYYY-MM-DD`.
 */
const yesterdayInParis = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' })
  .format(new Date(Date.now() - 24 * 60 * 60 * 1000));

const parseArgs = (argv) => {
  const parsed = { date: null, out: DEFAULT_OUT_DIR, sample: false, project: null, alias: 'default' };

  const readValue = (value, flag) => value ?? die(`${flag} needs a value.\n${USAGE}`);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--sample') {
      parsed.sample = true;
    } else if (arg === '--date') {
      parsed.date = readValue(argv[i += 1], '--date');
    } else if (arg === '--out') {
      parsed.out = resolve(readValue(argv[i += 1], '--out'));
    } else if (arg === '--project') {
      parsed.project = readValue(argv[i += 1], '--project');
    } else if (arg === '--production') {
      parsed.alias = 'production';
    } else if (arg === '--help' || arg === '-h') {
      console.log(USAGE);
      process.exit(0);
    } else {
      die(`Unknown argument "${arg}".\n${USAGE}`);
    }
  }

  if (parsed.date !== null && !DATE_PATTERN.test(parsed.date)) {
    die(`--date must be a YYYY-MM-DD Paris day, got "${parsed.date}".\n${USAGE}`);
  }

  return parsed;
};

const sampleOption = (label, statLabel, count) => ({ id: label, label, statLabel, count });

/**
 * The canned days `--sample` draws — deliberately the awkward ones.
 *
 * Two options with a short question is the roomiest card the layout ever draws,
 * six options with a 120-character question the tightest. Anything that reads on
 * both reads on a real day.
 */
const SAMPLE_DAYS = [
  {
    date: '2026-08-19',
    question: 'Ton dentifrice, tu le presses…',
    options: [ sampleOption('Par le bout', 'méthodique', 1840), sampleOption('N\'importe où', 'bordélique', 1210) ],
  },
  {
    date: '2026-08-20',
    question: 'Tu arrives à une soirée où tu ne connais personne. Tu fais quoi dans les cinq premières minutes ?',
    options: [
      sampleOption('Je vais direct parler à quelqu\'un', 'fonceur', 412),
      sampleOption('Je me colle au buffet', 'stratège', 908),
      sampleOption('Je sors mon téléphone', 'invisible', 655),
      sampleOption('Je repars', 'insaisissable', 97),
    ],
  },
  {
    date: '2026-08-21',
    question: 'Quand tu ranges le lave-vaisselle, tu commences toujours par quoi, très honnêtement ?',
    options: [
      sampleOption('Les couverts', 'perfectionniste', 320),
      sampleOption('Les assiettes', 'pragmatique', 289),
      sampleOption('Les verres', 'délicat.e', 244),
      sampleOption('Ce qui vient', 'imprévisible', 201),
      sampleOption('Le plus gros', 'bâtisseur.euse', 158),
      sampleOption('Je ne range pas', 'irrécupérable', 143),
    ],
  },
];

/** Turns a canned day into the exact shape `dailyRecapOf` returns. */
const toRecap = ({ date, question, options }) => {
  const totalAnswers = options.reduce((total, option) => total + option.count, 0);
  // The percentages are apportioned the way `recapData.ts` apportions them, so
  // a sample column adds up to 100 exactly as a real one does.
  const exact = options.map((option) => (option.count / totalAnswers) * 100);
  const percents = exact.map(Math.floor);
  const order = exact.map((value, index) => ({ index, fraction: value % 1 })).sort((a, b) => b.fraction - a.fraction);

  let left = 100 - percents.reduce((sum, value) => sum + value, 0);

  for (const { index } of order) {
    if (left <= 0) break;
    percents[index] += 1;
    left -= 1;
  }

  const withShares = options
    .map((option, index) => ({ ...option, share: option.count / totalAnswers, percent: percents[index] }))
    .sort((a, b) => b.count - a.count);

  return { date, questionId: `sample-${date}`, question, options: withShares, top: withShares[0], totalAnswers };
};

const writeCarousel = async (outDir, recap, buffers) => {
  await fs.mkdir(outDir, { recursive: true });

  const files = await Promise.all(buffers.map(async (buffer, index) => {
    const file = resolve(outDir, `${recap.date}-${index + 1}.jpg`);

    await fs.writeFile(file, buffer);

    return { file, bytes: buffer.length };
  }));

  console.log(`\n${recap.date} — « ${recap.question} »`);
  console.log(
    `  ${recap.top.percent} % ${recap.top.statLabel} · `
    + `${recap.options.length} réponses possibles · ${recap.totalAnswers} réponses`,
  );

  for (const { file, bytes } of files) {
    console.log(`  ✓ ${basename(file)}  ${(bytes / 1024).toFixed(0)} Ko`);
  }
};

/**
 * Fails now, with a sentence, rather than later with the SDK's own crash.
 *
 * Without credentials the Firestore client dies inside `google-gax` — six
 * frames deep, naming a documentation page rather than a command — and it does
 * so **outside** the promise this script awaits, so a `try` around the run
 * never sees it. Asking for a token up front is the only place the failure can
 * be caught at all, and it costs one fetch the SDK was going to make anyway.
 *
 * Skipped against the emulator, which authenticates nobody.
 */
const requireCredentials = async () => {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return;
  }

  try {
    await applicationDefault().getAccessToken();
  } catch {
    die('No Application Default Credentials.\n'
      + '  Run `gcloud auth application-default login`, or read the emulator instead:\n'
      + '  FIRESTORE_EMULATOR_HOST=127.0.0.1:8082 npm run render-instagram-card');
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (!args.sample) {
    const projectId = resolveProjectId(args);

    await requireCredentials();

    // `initFirebase()` inside the bundle calls `initializeApp()` with no
    // arguments — the same code the deployed function runs — so the project is
    // handed over the way the runtime hands it over, through the environment,
    // rather than by giving the script a second initialisation path.
    process.env.GOOGLE_CLOUD_PROJECT = projectId;
    process.env.GCLOUD_PROJECT = projectId;

    console.log(`Project: ${projectId}${process.env.FIRESTORE_EMULATOR_HOST ? ' (emulator)' : ''}`);
  }

  const { dailyRecapOf, renderRecapCarousel } = await loadFromSrc(
    'src/domains/instagram/index.ts',
    { assets: true },
  );

  const recaps = args.sample
    ? SAMPLE_DAYS.map(toRecap)
    : [ await dailyRecapOf(args.date ?? yesterdayInParis()) ];

  for (const recap of recaps) {
    if (recap === null) {
      // The two ways to have nothing to post are worth telling apart out loud:
      // no question ran that day, or it ran and nobody answered. Neither is an
      // error here — both are mornings the scheduler will skip.
      die(`Nothing to render for ${args.date ?? yesterdayInParis()} — no question ran that day, or nobody answered.`);
    }

    await writeCarousel(args.out, recap, await renderRecapCarousel(recap));
  }

  console.log(`\nWritten to ${args.out}`);
};

try {
  await main();
} catch (error) {
  die(error?.stack ?? error?.message ?? String(error));
}
