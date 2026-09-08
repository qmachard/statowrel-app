#!/usr/bin/env node
/**
 * Refuses to let a deploy ship a universal-link configuration that cannot work.
 *
 * The two files this checks are the *only* thing iOS and Android read before
 * deciding whether `https://statowrel-app.web.app/i/lou` opens the app, and
 * both platforms fail **silently** when they are wrong: iOS drops the
 * association without a user-visible error, Android leaves the link opening the
 * browser. Nothing in the app, in Firebase, or in a build log says so — the only
 * symptom is a referral link that quietly stops being a referral link.
 *
 * So the check runs from `firebase.json`'s hosting `predeploy`, after
 * `build:admin`, and it looks at two different things for two different
 * failures:
 *
 * 1. **Placeholders in `public/`** — the Apple Team ID and the Android SHA-256
 *    fingerprints are credentials, not repository content, so the committed
 *    files carry `REPLACE_WITH_…` markers. Deploying them serves a well-formed
 *    file naming an app that does not exist.
 * 2. **Absence from `dist/`** — `firebase.json`'s `ignore` array holds
 *    `**\/.*`, which drops every dot-path from the upload. That is why these
 *    files live under `public/well-known/` and are served through a rewrite
 *    rather than under a real `.well-known/`; this half of the check is what
 *    would catch anybody moving them back.
 *
 * `SKIP_APP_LINKS_CHECK=1` is the way past it, for a deploy that only means to
 * publish the console or the legal pages.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ADMIN_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = join(ADMIN_DIR, 'public', 'well-known');
const DIST_DIR = join(ADMIN_DIR, 'dist', 'well-known');

/** Where each value is actually obtained, quoted back in the failure. */
const WHERE = {
  REPLACE_WITH_APPLE_TEAM_ID:
    'Apple Team ID (10 characters) — developer.apple.com/account → Membership, '
    + 'or `APP_VARIANT=production npx eas credentials` under the iOS distribution certificate.',
  REPLACE_WITH_SHA256_EAS_UPLOAD_KEY:
    'SHA-256 of the EAS upload keystore — `APP_VARIANT=production npx eas credentials` → Android → Keystore. '
    + '`npm run check-google-signin` prints SHA-**1** only (that is what google-services.json carries); '
    + 'assetlinks wants SHA-256, so it cannot come from there.',
  REPLACE_WITH_SHA256_PLAY_APP_SIGNING_KEY:
    'SHA-256 of the Play app-signing key — Play Console → Test and release → App integrity → App signing key certificate. '
    + 'Required as well as the upload one: Play re-signs the AAB, so a binary installed from the store '
    + 'never presents the upload fingerprint.',
};

const FILES = [ 'apple-app-site-association.json', 'assetlinks.json' ];

if (process.env.SKIP_APP_LINKS_CHECK === '1') {
  console.warn(
    '[check-app-links] skipped (SKIP_APP_LINKS_CHECK=1). The deploy may serve an '
    + 'apple-app-site-association or assetlinks.json that no phone can verify.',
  );
  process.exit(0);
}

const problems = [];
const found = new Set();

for (const file of FILES) {
  const path = join(PUBLIC_DIR, file);

  if (!existsSync(path)) {
    problems.push(`${file} is missing from apps/admin/public/well-known/.`);

    continue;
  }

  const raw = readFileSync(path, 'utf8');

  try {
    JSON.parse(raw);
  } catch (error) {
    problems.push(`${file} is not valid JSON (${error.message}). Both platforms reject it whole.`);

    continue;
  }

  for (const marker of Object.keys(WHERE)) {
    if (raw.includes(marker)) {
      found.add(marker);
      problems.push(`${file} still carries ${marker}.`);
    }
  }
}

// The second failure, and the expensive one: the files exist, they are filled
// in, and the deploy drops them anyway. Only meaningful once a build has run.
if (existsSync(join(ADMIN_DIR, 'dist'))) {
  for (const file of FILES) {
    if (!existsSync(join(DIST_DIR, file))) {
      problems.push(
        `${file} did not reach apps/admin/dist/well-known/ — Vite copies apps/admin/public/ verbatim, `
        + 'so a missing file here means it was moved, renamed, or put back under a dot-directory '
        + "that firebase.json's `ignore` drops.",
      );
    }
  }
}

if (problems.length === 0) {
  console.log('[check-app-links] apple-app-site-association.json and assetlinks.json are ready to serve.');
  process.exit(0);
}

console.error('\n[check-app-links] refusing to deploy — universal links would fail silently.\n');

for (const problem of problems) {
  console.error(`  • ${problem}`);
}

if (found.size > 0) {
  console.error('\nWhere each value comes from:\n');

  for (const marker of found) {
    console.error(`  ${marker}\n    ${WHERE[marker]}\n`);
  }
}

console.error(
  'Fill them in at apps/admin/public/well-known/, then deploy again.\n'
  + 'To publish the console or the legal pages without them: SKIP_APP_LINKS_CHECK=1 npm run deploy:admin\n',
);

process.exit(1);
