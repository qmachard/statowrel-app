#!/usr/bin/env node
//
// Runs the 21:00 last-chance reminder on demand — docs/prd.md §4.6.
//
//   npm run run-streak-reminder -- --dry-run          # who would be reminded, and with what line
//   npm run run-streak-reminder -- --date 2026-09-08 --dry-run
//   npm run run-streak-reminder -- --send             # ... and really push it
//
// It exists because the reminder's whole value is its **targeting**, and
// targeting is the one thing a notification cannot show you: the interesting
// cases are the people who get nothing. Waiting for nine in the evening to find
// out whether a two-day streak was spared is not a test loop.
//
// **It runs the same code the scheduler will.** `scripts/lib/load-src.mjs`
// bundles `src/domains/daily-questions/helpers/streakReminder.ts` with the
// deploy build's own esbuild settings and requires it, exactly as the Instagram
// preview does — so `--dry-run` lists what the real query returns and prints
// the real copy, and there is no second implementation to drift from the one
// that goes out. A rule checked against a copy of itself is not checked.
//
// The loop it is built for is the emulator:
//
//   npm run dev:functions                          # firestore + auth emulators
//   npm run seed-emulator -- --days 20 --friends 4
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8082 npm run run-streak-reminder -- --dry-run
//
// A seeded database gives every case at once: a long streak that has not
// answered, one too short for the threshold, an account that already answered,
// one that already spent its joker, and one whose wallet cannot pay for a
// joker. `--dry-run` names which of the five each account fell into.
//
// **There is no emulator for Expo push**, exactly as for the other notification
// script: `FIRESTORE_EMULATOR_HOST` decides where the profiles and the tokens
// are read from and nothing else. `--send` really posts to Expo, so it is
// required rather than defaulted, and a real project needs `--force` on top.
//
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import {
  JOKER_STATFLOUZZ_COST,
  STREAK_REMINDER_MIN_STREAK,
  USER_COLLECTION,
  previousDateKey,
} from '@statowrel/models';

import { die, resolveProjectId } from './lib/firebase-project.mjs';
import { loadFromSrc } from './lib/load-src.mjs';

const USAGE = 'Usage: npm run run-streak-reminder -- (--dry-run | --send) [--date YYYY-MM-DD] '
  + '[--production | --project <id>] [--force]';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Today in Paris — the day the scheduler would be running for at 21:00. */
const todayInParis = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' })
  .format(new Date());

const parseArgs = (argv) => {
  const parsed = { date: null, dryRun: false, send: false, force: false, project: null, alias: 'default' };

  const readValue = (value, flag) => value ?? die(`${flag} needs a value.\n${USAGE}`);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--send') {
      parsed.send = true;
    } else if (arg === '--force') {
      parsed.force = true;
    } else if (arg === '--date') {
      parsed.date = readValue(argv[i += 1], '--date');
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

  if (parsed.dryRun === parsed.send) {
    die(`Pass exactly one of --dry-run or --send.\n${USAGE}`);
  }

  if (parsed.date !== null && !DATE_PATTERN.test(parsed.date)) {
    die(`--date must be a YYYY-MM-DD Paris day, got "${parsed.date}".\n${USAGE}`);
  }

  return parsed;
};

/**
 * Fails now, with a sentence, rather than six frames deep inside `google-gax`
 * and outside the promise this script awaits — same reasoning as
 * `render-instagram-card.mjs`. Skipped against the emulator, which
 * authenticates nobody.
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
      + '  FIRESTORE_EMULATOR_HOST=127.0.0.1:8082 npm run run-streak-reminder -- --dry-run');
  }
};

/**
 * What a dry run prints per account, and the reason this script is worth its
 * lines: the five outcomes the reminder has, named.
 *
 * Only the first two are visible from a phone. The three exclusions are the
 * ones that matter — an account that already answered, one that already spent
 * its joker and one whose streak is too short all look identical from the
 * outside, and all three look identical to a bug that sent nothing.
 */
const reportAtRisk = (atRisk, reminderFor, date) => {
  console.log(`\n${atRisk.length} compte(s) relancé(s) pour le ${date} :\n`);

  for (const user of atRisk) {
    const line = reminderFor(user, date);
    const route = line.data.intent === 'joker' ? 'jour + confirmation Joker' : 'jour';

    console.log(`  ${user.user_id}`);
    console.log(`    série     ${user.streak_count} jours, solde ${user.statcoin_balance}§`);
    console.log(`    titre     ${line.title}`);
    console.log(`    corps     ${line.body}`);
    console.log(`    tap       ${route}`);
    console.log(`    canal     ${line.channelId}\n`);
  }
};

/**
 * The other half of the dry run, and the half worth having: who was spared,
 * and by which rule.
 *
 * The short streaks come out of the production code itself — the difference
 * between `streakReminderCandidates` and `streaksAtRisk` *is* the threshold,
 * so nothing is re-implemented here. The accounts that have already done their
 * day are read separately, on the other side of the very equality the
 * production query keys on: `streak_last_answered_on` holding **today** is
 * what answering, or spending a joker, writes there. That read exists nowhere
 * in production and belongs nowhere else — at 21:00 those accounts simply do
 * not come back, which is the point.
 */
const reportSpared = async (db, candidates, atRisk, date) => {
  const remindedIds = new Set(atRisk.map((user) => user.user_id));
  const tooShort = candidates.filter((user) => !remindedIds.has(user.user_id));

  console.log(`${tooShort.length} compte(s) écarté(s), série trop courte :`);
  for (const user of tooShort) {
    console.log(`  ${user.user_id} — ${user.streak_count} jour(s), sous le seuil`);
  }

  const done = await db.collection(USER_COLLECTION).where('streak_last_answered_on', '==', date).get();

  console.log(`\n${done.size} compte(s) écarté(s), journée déjà faite :`);
  for (const document of done.docs) {
    console.log(`  ${document.id} — série de ${document.get('streak_count')} jours, déjà répondu ou joker posé`);
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const date = args.date ?? todayInParis();
  const onEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  const projectId = resolveProjectId(args);

  await requireCredentials();

  // `initFirebase()` inside the bundle calls `initializeApp()` with no
  // arguments — the same code the deployed function runs — so the project is
  // handed over through the environment rather than through a second
  // initialisation path.
  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  process.env.GCLOUD_PROJECT = projectId;

  console.log(`Project: ${projectId}${onEmulator ? ' (emulator)' : ''}`);
  console.log(`Jour   : ${date} (les séries dont la dernière réponse date du ${previousDateKey(date)})`);
  console.log(`Seuil  : ${STREAK_REMINDER_MIN_STREAK} jours, Joker à ${JOKER_STATFLOUZZ_COST}§`);

  if (args.send && !onEmulator && !args.force) {
    die('--send against a real project really pushes to real phones. Add --force if that is the intent.');
  }

  const {
    sendStreakReminders, streakReminderCandidates, streakReminderFor, streaksAtRisk,
  } = await loadFromSrc('src/domains/daily-questions/helpers/streakReminder.ts');

  const candidates = await streakReminderCandidates(date);
  const atRisk = await streaksAtRisk(date);

  reportAtRisk(atRisk, streakReminderFor, date);

  if (args.dryRun) {
    // The bundle already initialised the default app; reuse it rather than
    // opening a second one against the same emulator.
    await reportSpared(
      getFirestore(getApps()[0] ?? initializeApp({ projectId })),
      candidates,
      atRisk,
      date,
    );

    console.log('\n--dry-run : rien n\'a été envoyé.');

    return;
  }

  if (atRisk.length === 0) {
    // Not an error, and worth saying out loud: an evening where everybody
    // answered is exactly what the reminder is meant to end in.
    console.log('Aucune série en danger ce soir : personne n\'est relancé.');

    return;
  }

  const report = await sendStreakReminders(date);

  console.log(`Envoyé : ${report.sent}, échoués : ${report.failed}, tokens purgés : ${report.pruned}`);

  if (report.sent === 0) {
    console.log('Aucun appareil enregistré pour ces comptes — l\'app n\'a jamais été lancée connectée sur un vrai téléphone.');
  }
};

try {
  await main();
} catch (error) {
  die(error?.stack ?? error?.message ?? String(error));
}
