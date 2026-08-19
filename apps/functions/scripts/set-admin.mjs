#!/usr/bin/env node
//
// Grant or revoke the `admin` custom claim on a Firebase Auth user, by email.
//
// The claim is what `isAdmin()` in packages/firestore-config/firestore.rules tests
// (`request.auth.token.admin == true`). There is no Firebase CLI command for custom
// claims — they only exist through the Admin SDK.
//
//   npm run set-admin -- <email>                  # default project (.firebaserc)
//   npm run set-admin -- <email> --production     # production project (.firebaserc)
//   npm run set-admin -- <email> --project <id>
//   npm run set-admin -- <email> --revoke
//
// Authenticates with Application Default Credentials:
//   gcloud auth application-default login
// Against the emulator, set FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 instead.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const USAGE = `Usage: npm run set-admin -- <email> [--production | --project <id>] [--revoke]`;

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const die = (message) => {
  console.error(`✖ ${message}`);
  process.exit(1);
};

const parseArgs = (argv) => {
  const parsed = { email: null, project: null, alias: 'default', revoke: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--revoke') {
      parsed.revoke = true;
    } else if (arg === '--production') {
      parsed.alias = 'production';
    } else if (arg === '--project') {
      parsed.project = argv[i += 1] ?? die(`--project needs a project id.\n${USAGE}`);
    } else if (arg.startsWith('-')) {
      die(`Unknown flag "${arg}".\n${USAGE}`);
    } else if (parsed.email) {
      die(`Only one email at a time (got "${parsed.email}" and "${arg}").\n${USAGE}`);
    } else {
      parsed.email = arg;
    }
  }

  if (!parsed.email) die(`Missing email.\n${USAGE}`);

  return parsed;
};

// The project ids live in .firebaserc so this script and `firebase use` never drift apart.
const resolveProjectId = ({ project, alias }) => {
  if (project) return project;

  let projects;
  try {
    ({ projects } = JSON.parse(readFileSync(resolve(REPO_ROOT, '.firebaserc'), 'utf-8')));
  } catch (error) {
    die(`Could not read .firebaserc (${error.message}). Pass --project <id> instead.`);
  }

  return projects?.[alias] ?? die(`No "${alias}" project in .firebaserc. Pass --project <id> instead.`);
};

const { email, revoke, ...selector } = parseArgs(process.argv.slice(2));
const projectId = resolveProjectId(selector);
const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;

initializeApp({
  projectId,
  // The emulator accepts any credential; ADC may not even be configured.
  ...(emulator ? {} : { credential: applicationDefault() }),
});

const auth = getAuth();

const user = await auth.getUserByEmail(email).catch((error) => {
  if (error.code === 'auth/user-not-found') {
    die(`No user with email "${email}" in ${projectId}. They must sign in once before they can be made admin.`);
  }
  if (error.code === 'auth/insufficient-permission' || error.errorInfo?.code === 'auth/internal-error') {
    die(`Cannot reach ${projectId}: ${error.message}\nCheck the account behind your ADC has access to that project.`);
  }
  die(error.message);
});

// setCustomUserClaims replaces the whole claims object — keep everything else.
const claims = { ...user.customClaims };
if (revoke) delete claims.admin;
else claims.admin = true;

await auth.setCustomUserClaims(user.uid, claims);

// Without this the old ID token keeps its stale claims for up to an hour.
await auth.revokeRefreshTokens(user.uid);

console.log(`✔ ${revoke ? 'Revoked admin from' : 'Granted admin to'} ${email} (${user.uid}) on ${projectId}`);
console.log('  Their sessions were revoked — they need to sign in again for it to take effect.');
