#!/usr/bin/env node
//
// Says which Android signing fingerprints Firebase has *actually* turned into
// OAuth clients — the one question « j'ai pourtant mis la bonne empreinte »
// cannot answer on its own.
//
//   npm run check-google-signin
//   npm run check-google-signin -- --variant development
//   npm run check-google-signin -- --expect AA:BB:CC:…   # the SHA-1 an install presents
//
// Why the file is proof, and why the console is not: adding a fingerprint on a
// Firebase Android app is a *request* to create an Android OAuth client, and
// Google refuses it — silently, keeping the fingerprint on display — when a
// client already exists for the same package name and SHA-1 in another project
// (https://support.google.com/firebase/answer/6401008). The console then shows
// an empreinte that authorises nothing, and Play services answers every
// sign-in with `DEVELOPER_ERROR` (code 10), which `src/auth/providers.ts`
// translates as « La connexion Google ne fonctionne pas sur cette version de
// l'app ». `google-services.json` carries one `oauth_client` entry per client
// that was really created, so it is the only place the refusal is visible.
//
// Which makes the freshness of the download the whole point: the file is a
// snapshot, never a link. This script prints its age for that reason — a check
// against a copy downloaded before the fingerprint was added says nothing at
// all.
//
// Reads only the checkout: no network, no credentials, no Firebase project.
// It cannot see the fingerprints an install presents — those come from
// `eas credentials` and from Play Console → App integrity — so `--expect`
// takes them from you and answers whether they are registered.
//
import { readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(APP_ROOT, '../..');

const die = (message) => {
  console.error(`✖ ${message}`);
  process.exit(1);
};

/**
 * `app.config.ts`'s `firebaseSuffix`: three build profiles, two service files —
 * `preview` and `production` share a bundle identifier, so they share an app.
 *
 * The package names are repeated from `app.config.ts` rather than read out of
 * it (a TypeScript module the Expo CLI evaluates, not something a plain script
 * can import), and they are what scopes this check: a `google-services.json`
 * downloaded from the project rather than from one app carries **every** Android
 * app of the project, and the `.dev` one's fingerprints say nothing about the
 * build in question.
 */
const VARIANTS = {
  development: { profiles: [ 'development' ], packages: [ 'fr.quentinmachard.statowrel.dev' ] },
  production: { profiles: [ 'preview', 'production' ], packages: [ 'fr.quentinmachard.statowrel' ] },
};

/**
 * One shape for both spellings: `google-services.json` stores a hash as bare
 * lowercase hex, while Firebase and Play Console both display it in
 * colon-separated uppercase. Comparing them as typed is how a fingerprint that
 * *is* registered reads as missing.
 */
const normalizeHash = (value) => String(value ?? '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();

const formatHash = (value) => normalizeHash(value).match(/.{2}/g)?.join(':') ?? '';

const parseArgs = (argv) => {
  const expected = [];
  let variant = 'production';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--variant') {
      variant = argv[index += 1] ?? die('--variant takes a value.');
    } else if (arg === '--expect') {
      const value = argv[index += 1] ?? die('--expect takes a SHA-1.');
      const hash = normalizeHash(value);

      if (hash.length !== 40) {
        die(
          `--expect "${value}" is not a SHA-1 (${hash.length || 'no'} hex characters, expected 40). ` +
            'A SHA-256 mints no Android OAuth client — only the SHA-1 does.',
        );
      }

      expected.push(hash);
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: npm run check-google-signin -- [--variant development|production] [--expect <SHA-1>]…');
      process.exit(0);
    } else {
      die(`Unknown argument "${arg}". Try --help.`);
    }
  }

  if (!VARIANTS[variant]) {
    die(`Unknown variant "${variant}", expected ${Object.keys(VARIANTS).join(' | ')}.`);
  }

  return { variant, expected };
};

const describeAge = (path) => {
  const days = Math.floor((Date.now() - statSync(path).mtimeMs) / 86_400_000);

  if (days === 0) return 'downloaded today';
  if (days === 1) return 'downloaded yesterday';

  return `downloaded ${days} days ago`;
};

const readJson = (path, what) => {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      die(
        `No ${what} at ${relative(REPO_ROOT, path)}. The service files are gitignored — ` +
          'download them from the Firebase console (Project settings → Your apps), see ' +
          'apps/app/firebase/README.md.',
      );
    }

    die(`Could not read ${relative(REPO_ROOT, path)}: ${error.message}`);
  }
};

/** The web client id `src/auth/providers.ts` passes to `GoogleSignin.configure()`. */
const webClientIdsFromEas = (profiles) => {
  const eas = readJson(resolve(APP_ROOT, 'eas.json'), 'eas.json');

  return profiles.map((profile) => ({
    profile,
    clientId: eas.build?.[profile]?.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? null,
  }));
};

const { variant, expected } = parseArgs(process.argv.slice(2));
const { profiles, packages } = VARIANTS[variant];

const servicesPath = resolve(APP_ROOT, `firebase/google-services.${variant}.json`);
const services = readJson(servicesPath, 'google-services.json');

const problems = [];
const warnings = [];
const easWebClientIds = webClientIdsFromEas(profiles);
const fileWebClientIds = new Set();

console.log(`\n${relative(REPO_ROOT, servicesPath)} — ${describeAge(servicesPath)}`);
console.log(`project ${services.project_info?.project_id ?? '?'} (${services.project_info?.project_number ?? '?'})\n`);

// Only the app this variant builds: a project-wide download carries the other
// one too, and answering for it would fail a setup that is correct.
const variantClients = (services.client ?? []).filter(
  (client) => packages.includes(client.client_info?.android_client_info?.package_name),
);

if (variantClients.length === 0) {
  die(
    `This file carries no app for ${packages.join(' / ')}. It was downloaded for another app — ` +
      'the service files are one per bundle identifier, see apps/app/firebase/README.md.',
  );
}

for (const client of variantClients) {
  const packageName = client.client_info?.android_client_info?.package_name ?? '?';
  const oauthClients = client.oauth_client ?? [];
  // `client_type` 1 is an Android client — a package name plus one SHA-1. Only
  // a SHA-1 mints one: a fingerprint registered as SHA-256 alone (App Check,
  // Dynamic Links) leaves nothing here and authorises no sign-in.
  const androidClients = oauthClients.filter((entry) => entry.client_type === 1);
  const webClient = oauthClients.find((entry) => entry.client_type === 3);

  console.log(`▸ ${packageName}`);
  console.log(`  app id: ${client.client_info?.mobilesdk_app_id ?? '?'}`);

  if (androidClients.length === 0) {
    console.log('  fingerprints turned into OAuth clients: none');
    problems.push(
      `${packageName} has no Android OAuth client. Every Google sign-in from this package answers ` +
        'DEVELOPER_ERROR, whatever the Firebase console displays — see apps/app/firebase/README.md ' +
        '§ Android SHA-1, "a fingerprint on display that authorises nothing".',
    );
  } else {
    console.log(`  fingerprints turned into OAuth clients: ${androidClients.length}`);

    for (const entry of androidClients) {
      console.log(`    ${formatHash(entry.android_info?.certificate_hash)}`);
    }
  }

  for (const wanted of expected) {
    const registered = androidClients.some(
      (entry) => normalizeHash(entry.android_info?.certificate_hash) === wanted,
    );

    console.log(`  ${registered ? '✔' : '✖'} --expect ${formatHash(wanted)}`);

    if (!registered) {
      problems.push(`${formatHash(wanted)} is not registered on ${packageName}.`);
    }
  }

  console.log(`  web client: ${webClient?.client_id ?? 'none'}`);

  if (webClient) {
    fileWebClientIds.add(webClient.client_id);
  } else {
    problems.push(`${packageName} carries no web OAuth client, which is the id GoogleSignin.configure() needs.`);
  }

  console.log('');
}

// The id `GoogleSignin.configure()` is handed comes from `eas.json`, not from
// the service file — a build can therefore sign against a web client that
// belongs to another project, and Firebase refuses the token it mints.
for (const { profile, clientId } of easWebClientIds) {
  if (!clientId) {
    problems.push(`eas.json profile "${profile}" sets no EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.`);
  } else if (fileWebClientIds.size > 0 && !fileWebClientIds.has(clientId)) {
    problems.push(
      `eas.json profile "${profile}" signs against ${clientId}, which is not this project's web client ` +
        `(${[ ...fileWebClientIds ].join(', ')}).`,
    );
  }
}

// Two installs, two certificates: an APK taken off the EAS dashboard carries the
// upload key, anything installed from Play carries the key Google re-signed it
// with. One registered client covers one of them and reads as « it works on my
// build » right up to the store.
if (variant === 'production') {
  const androidCount = variantClients
    .flatMap((client) => client.oauth_client ?? [])
    .filter((entry) => entry.client_type === 1)
    .length;

  if (androidCount === 1) {
    warnings.push(
      'Only one Android OAuth client for the production package. A Play install and an EAS-dashboard ' +
        'install present different certificates, so both fingerprints have to be registered — and a ' +
        'link from Internal app sharing presents a third one (Play Console → App integrity).',
    );
  }
}

for (const warning of warnings) {
  console.log(`⚠ ${warning}\n`);
}

for (const problem of problems) {
  console.error(`✖ ${problem}\n`);
}

if (problems.length === 0 && warnings.length === 0) {
  console.log('✔ Nothing to report against this copy of the file.\n');
}

console.log(
  'This reads the checkout alone. Re-download google-services.json after touching the fingerprints, ' +
    'or the answer above is the one from before.\n',
);

process.exit(problems.length > 0 ? 1 : 0);
