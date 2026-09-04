#!/usr/bin/env node
//
// Grants the initial StatFlouzz wallet (`INITIAL_STATFLOUZZ_BALANCE`) to every
// account that never touched its wallet — docs/prd.md §4.7 and §4.8.
//
//   npm run backfill-initial-balance                  # default project (.firebaserc)
//   npm run backfill-initial-balance -- --production
//   npm run backfill-initial-balance -- --dry-run     # writes nothing, reports every account
//
// Why. The rules used to require a fresh profile to open at 0§, and every
// account created since sign-up carries `statcoin_balance == 0`. The wallet
// now opens at 50§ — enough to try one joker before the first streak
// milestone pays — and this pass grants those 50§ retroactively to the
// accounts that predate the change. New accounts get it from the rules
// themselves and are left alone here.
//
// Idempotency without a new field. The pass credits « up to 50§, if and
// only if the wallet was never used »: `statcoins_earned == 0 &&
// statcoins_spent == 0 && statcoin_balance < 50`, and the top-up amount is
// `50 - balance`. Which is precisely the account this script exists for. Run
// it twice and the second pass finds every eligible account already sitting
// at 50, so it writes nothing. An account that has already earned or spent —
// through a streak milestone or a proposal — is left where it is: the whole
// point of the grant is a starting kitty, not a bonus for the active.
//
// The wallet is credited to `statcoin_balance` alone: the opening amount is
// a grant, not something the user earned, so `statcoins_earned` stays 0. That
// is what keeps the idempotency check honest — an account with
// `earned == 0 && spent == 0 && balance == 50` reads exactly as one this
// script has already served.
//
// `--dry-run` reports **every** account, not only the ones it would touch.
// « Never touched, already at 50 », « active account, skipped » and « fresh,
// crediting 50 » must be legible from the outside — the first two are noise
// and the third is the work.
//
// Admin SDK and not a client: `firestore.rules` denies every client write
// that moves the wallet.
//
// Authenticates with Application Default Credentials:
//   gcloud auth application-default login
// Against the emulator, set FIRESTORE_EMULATOR_HOST=localhost:8080 instead.

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

import { die, resolveProjectId } from './lib/firebase-project.mjs';

const USAGE = 'Usage: npm run backfill-initial-balance -- [--production | --project <id>] [--dry-run]';

const BATCH_SIZE = 400;

const parseArgs = (argv) => {
  const parsed = { project: null, alias: 'default', dryRun: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--production') {
      parsed.alias = 'production';
    } else if (arg === '--project') {
      parsed.project = argv[i += 1] ?? die(`--project needs a project id.\n${USAGE}`);
    } else {
      die(`Unknown argument "${arg}".\n${USAGE}`);
    }
  }

  return parsed;
};

const { dryRun, ...selector } = parseArgs(process.argv.slice(2));
const projectId = resolveProjectId(selector);
const emulator = process.env.FIRESTORE_EMULATOR_HOST;

const models = await import('@statowrel/models').catch((error) => die(
  `Could not load @statowrel/models (${error.message}).\nRun \`npm run build:models\` first.`,
));

const { INITIAL_STATFLOUZZ_BALANCE, USER_COLLECTION } = models;

initializeApp({
  projectId,
  ...(emulator ? {} : { credential: applicationDefault() }),
});

const firestore = getFirestore();

const numberOf = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const target = `${projectId}${emulator ? ` (emulator ${emulator})` : ''}`;

console.log(`→ Backfilling initial StatFlouzz balance on ${target}${dryRun ? ' (dry run)' : ''}`);
console.log(`  Grant amount: ${INITIAL_STATFLOUZZ_BALANCE}§`);

const users = await firestore.collection(USER_COLLECTION).get();

if (users.empty) {
  console.log('  No profiles found. Nothing to do.');
  process.exit(0);
}

let pending = firestore.batch();
let pendingOps = 0;
let credited = 0;
let alreadyAtInitial = 0;
let activeSkipped = 0;

const flush = async () => {
  if (pendingOps === 0) return;
  await pending.commit();
  pending = firestore.batch();
  pendingOps = 0;
};

for (const document of users.docs) {
  const data = document.data();
  const balance = numberOf(data.statcoin_balance);
  const earned = numberOf(data.statcoins_earned);
  const spent = numberOf(data.statcoins_spent);
  const label = data.username ? `@${data.username}` : document.id;

  if (earned > 0 || spent > 0) {
    console.log(`  · ${label}: active account (earned=${earned}, spent=${spent}, balance=${balance}), skipped`);
    activeSkipped += 1;
    continue;
  }

  if (balance >= INITIAL_STATFLOUZZ_BALANCE) {
    console.log(`  · ${label}: already at ${balance}§, nothing to do`);
    alreadyAtInitial += 1;
    continue;
  }

  const topUp = INITIAL_STATFLOUZZ_BALANCE - balance;

  console.log(`  ✓ ${label}: crediting +${topUp}§ (balance ${balance} → ${INITIAL_STATFLOUZZ_BALANCE})${dryRun ? ' [dry-run]' : ''}`);
  credited += 1;

  if (dryRun) continue;

  pending.update(document.ref, {
    statcoin_balance: FieldValue.increment(topUp),
    updated_at: Timestamp.now(),
  });
  pendingOps += 1;

  if (pendingOps >= BATCH_SIZE) {
    await flush();
  }
}

if (!dryRun) {
  await flush();
}

console.log('');
console.log(`  Credited: ${credited}`);
console.log(`  Already at ${INITIAL_STATFLOUZZ_BALANCE}§: ${alreadyAtInitial}`);
console.log(`  Active accounts skipped: ${activeSkipped}`);

if (dryRun) {
  console.log('  (dry run — nothing was written)');
}
