#!/usr/bin/env node
//
// Sends the moderation digest by hand — the one part of the morning that cannot
// be checked from a screen, since it leaves the backend and only comes back in
// somebody's inbox on Wednesday morning.
//
// It builds exactly what `questions-scheduleModerationDigest` builds, off the
// same file: `src/domains/questions/emails/moderationDigest.fr.html` is read
// from disk here and inlined into the deployed bundle over there, so the mail
// that reads right in a dry run is the mail that lands tomorrow morning. Only
// the filling is duplicated — a `.mjs` cannot import the TypeScript in `src/`
// — so `helpers/moderationDigest.ts` and this have to agree on it.
//
//   npm run send-moderation-digest -- --dry-run           # reads the pot, sends nothing
//   npm run send-moderation-digest -- --dry-run --html    # ... showing the HTML body instead
//   npm run send-moderation-digest -- --to moi@exemple.fr  # really sends, to that address only
//   npm run send-moderation-digest -- --production --force # ... to every real moderator
//
// **A target is required rather than defaulted.** `--dry-run` or `--to` say what
// a run is for; mailing every account holding the `admin` claim needs `--force`,
// because the default of a script that reaches real inboxes cannot be "all of
// them".
//
// **There is no emulator for Resend.** `FIRESTORE_EMULATOR_HOST` (plus
// `FIREBASE_AUTH_EMULATOR_HOST` for the moderator list) decides where the
// *questions* are read from, and nothing else: the mail is real and really
// lands.
//
//   FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
//     npm run send-moderation-digest -- --dry-run
//
// Authenticates with Application Default Credentials:
//   gcloud auth application-default login
//
// A real send reads `RESEND_API_KEY` from the environment — the deployed
// function reads the same value out of Secret Manager, which a script cannot.
// `RESEND_FROM` is the sender, and falls back to Resend's shared one.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { GeoPoint, getFirestore, Timestamp } from 'firebase-admin/firestore';

import { die, resolveProjectId } from './lib/firebase-project.mjs';

const USAGE = 'Usage: npm run send-moderation-digest -- [--dry-run] [--to <email>] [--html] '
  + '[--production | --project <id>] [--force]';

const RESEND_BATCH_ENDPOINT = 'https://api.resend.com/emails/batch';

/** Same cap as `helpers/moderationDigest.ts` — past a screenful the list stops being read. */
const LISTED_QUESTIONS = 20;

const parseArgs = (argv) => {
  const parsed = { to: [], html: false, project: null, alias: 'default', dryRun: false, force: false };

  const readValue = (value, flag) => value ?? die(`${flag} needs a value.\n${USAGE}`);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--html') {
      parsed.html = true;
    } else if (arg === '--force') {
      parsed.force = true;
    } else if (arg === '--production') {
      parsed.alias = 'production';
    } else if (arg === '--to') {
      parsed.to.push(readValue(argv[i += 1], '--to'));
    } else if (arg === '--project') {
      parsed.project = readValue(argv[i += 1], '--project');
    } else {
      die(`Unknown argument "${arg}".\n${USAGE}`);
    }
  }

  if (!parsed.dryRun && parsed.to.length === 0 && !parsed.force) {
    die(
      'Say where the digest goes — --dry-run to send nothing, --to <email> to send to yourself,\n'
      + `  or --force to mail every account holding the \`admin\` claim.\n${USAGE}`,
    );
  }

  return parsed;
};

const { to, html: showHtml, dryRun, force, ...selector } = parseArgs(process.argv.slice(2));
const projectId = resolveProjectId(selector);
const emulator = process.env.FIRESTORE_EMULATOR_HOST;

// The models package is TypeScript compiled to dist/, which a plain .mjs cannot
// read — the npm script builds it first, so this only fails when the script is
// run by hand from a workspace that never built it.
const { QUESTION_COLLECTION, questionConverter } = await import('@statowrel/models').catch(() => (
  die('Could not load @statowrel/models — run `npm run build:models` first.')
));

initializeApp({
  projectId,
  // The emulator accepts any credential; ADC may not even be configured.
  ...(emulator ? {} : { credential: applicationDefault() }),
});

const firestore = getFirestore();

/**
 * The whole `pending` pot, oldest first — read exactly as `pendingQuestions.ts`
 * reads it, equality only and sorted in memory, so this needs no index the
 * function does not need either.
 */
const pendingQuestions = async () => {
  const snapshot = await firestore
    .collection(QUESTION_COLLECTION)
    .withConverter(questionConverter(Timestamp, GeoPoint))
    .where('status', '==', 'pending')
    .get();

  return snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .sort((left, right) => left.created_at.localeCompare(right.created_at));
};

/** Every address holding the `admin` claim — the walk `adminRecipients.ts` does. */
const adminEmails = async () => {
  const auth = getAuth();
  const addresses = new Set();
  let missingAddress = 0;
  let pageToken;

  do {
    const page = await auth.listUsers(1000, pageToken).catch((error) => (
      die(`Cannot list the users of ${projectId}: ${error.message}\n  Check the account behind your ADC has access to that project.`)
    ));

    for (const user of page.users) {
      if (user.customClaims?.admin !== true) continue;

      if (user.email) addresses.add(user.email.toLowerCase());
      else missingAddress += 1;
    }

    pageToken = page.pageToken;
  } while (pageToken);

  if (missingAddress > 0) {
    console.error(`  ✖ ${missingAddress} admin account${missingAddress === 1 ? ' carries' : 's carry'} no e-mail address and cannot be mailed.`);
  }

  return [ ...addresses ];
};

// ---------------------------------------------------------------------------
// The digest itself.
//
// The wording is `src/domains/questions/emails/moderationDigest.fr.html`, read
// here from disk and inlined into the bundle by esbuild over there — one copy,
// so a dry run shows what Wednesday morning sends. The filling below is the copy: a `.mjs`
// cannot import the TypeScript in `src/`, so `helpers/moderationDigest.ts` and
// this have to agree. Change one, change the other.
// ---------------------------------------------------------------------------

const TEMPLATE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/domains/questions/emails/moderationDigest.fr.html');

const template = await readFile(TEMPLATE_PATH, 'utf-8').catch(() => (
  die(`Could not read the e-mail template at ${TEMPLATE_PATH}.`)
));

const escapeHtml = (text) => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Fills the `{{KEY}}` placeholders `values` names and leaves the others standing. */
const fillPlaceholders = (source, values) => (
  source.replace(/\{\{(\w+)\}\}/g, (placeholder, key) => values[key] ?? placeholder)
);

/** Replaces one `<!--NAME-->…<!--/NAME-->` block with whatever `render` makes of the fragment inside it. */
const fillBlock = (source, name, render) => {
  const block = new RegExp(`[ \\t]*<!--${name}-->\\s*([\\s\\S]*?)\\s*<!--/${name}-->[ \\t]*\\n?`);
  const found = source.match(block);

  if (found === null) {
    die(`The e-mail template has no ${name} block.`);
  }

  return source.replace(block, () => render(found[1]));
};

const consoleUrl = `https://${projectId}.web.app/admin`;

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const proposedOn = (question) => {
  const date = new Date(question.created_at);

  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date);
};

const authorOf = (question) => question.author_username ?? 'auteur inconnu';

const subjectOf = (count) => (
  count === 1 ? '1 question à modérer sur StatOwrel' : `${count} questions à modérer sur StatOwrel`
);

const introOf = (count) => (
  count === 1
    ? 'Une question attend une décision dans la console de modération.'
    : `${count} questions attendent une décision dans la console de modération.`
);

const moreOf = (remaining) => `… et ${remaining} autre${remaining > 1 ? 's' : ''}.`;

const textBodyOf = (questions) => {
  const lines = questions.slice(0, LISTED_QUESTIONS)
    .map((question) => `- « ${question.label} » — ${authorOf(question)}, ${proposedOn(question)}`);

  const remaining = questions.length - lines.length;

  return [
    introOf(questions.length),
    '',
    ...lines,
    ...(remaining > 0 ? [ `- ${moreOf(remaining)}` ] : []),
    '',
    `Modérer : ${consoleUrl}`,
  ].join('\n');
};

const htmlBodyOf = (questions) => {
  const listed = questions.slice(0, LISTED_QUESTIONS);
  const remaining = questions.length - listed.length;

  let body = fillPlaceholders(template, { INTRO: escapeHtml(introOf(questions.length)), URL: consoleUrl });

  body = fillBlock(body, 'QUESTION_ROW', (row) => listed.map((question) => fillPlaceholders(row, {
    LABEL: escapeHtml(question.label),
    AUTHOR: escapeHtml(authorOf(question)),
    DATE: proposedOn(question),
  })).join(''));

  body = fillBlock(body, 'MORE_ROW', (row) => (
    remaining > 0 ? fillPlaceholders(row, { MORE: escapeHtml(moreOf(remaining)) }) : ''
  ));

  // The note to whoever edits the template does not belong in a moderator's mail.
  body = body.replace(/[ \t]*<!--[\s\S]*?-->[ \t]*\n?/g, '');

  const unfilled = body.match(/\{\{(\w+)\}\}/);

  if (unfilled !== null) {
    die(`The e-mail template left ${unfilled[0]} unfilled.`);
  }

  return body;
};

// ---------------------------------------------------------------------------

console.log(`→ ${projectId}${emulator ? ` (questions read from the emulator at ${emulator})` : ''}`);

const questions = await pendingQuestions();

// The whole point of the feature, and the one behaviour worth checking by hand:
// an empty pot is a morning with no mail at all, not a mail saying there is
// nothing.
if (questions.length === 0) {
  console.log('✔ Nothing waiting for moderation — the Wednesday run would send nothing at all, and neither does this.');
  process.exit(0);
}

const recipients = to.length > 0 ? to : await adminEmails();

if (recipients.length === 0) {
  die(
    `${questions.length} question${questions.length === 1 ? ' is' : 's are'} waiting, but no account holds the \`admin\` claim in ${projectId}.\n`
    + '  Grant it with `npm run set-admin -- <email>` — otherwise the digest has nowhere to go.',
  );
}

const subject = subjectOf(questions.length);
const text = textBodyOf(questions);
const html = htmlBodyOf(questions);

console.log(`→ ${questions.length} pending, ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}: ${recipients.join(', ')}`);
console.log(`\n  Subject: ${subject}\n`);
console.log((showHtml ? html : text).split('\n').map((line) => `  ${line}`).join('\n'));
console.log('');

if (dryRun) {
  console.log('✔ Dry run — nothing sent.');
  process.exit(0);
}

if (to.length === 0 && selector.alias === 'production' && !force) {
  die('Without --to, this mails every real moderator on production. Add --force if that is really what you want.');
}

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  die(
    'RESEND_API_KEY is not set.\n'
    + '  The deployed function reads it from Secret Manager, which a script cannot: export it for this run\n'
    + '  (`RESEND_API_KEY=... npm run send-moderation-digest -- --to moi@exemple.fr`), or pass --dry-run.',
  );
}

const from = process.env.RESEND_FROM || 'StatOwrel <onboarding@resend.dev>';

const response = await fetch(RESEND_BATCH_ENDPOINT, {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(recipients.map((recipient) => ({ from, to: recipient, subject, html, text }))),
});

if (!response.ok) {
  const body = await response.text();

  console.error(`✖ Resend refused the batch (${response.status} ${response.statusText}): ${body}`);

  if (response.status === 403 && from.includes('resend.dev')) {
    // The one failure worth naming: Resend's shared sender only delivers to the
    // address the account was opened with, and refuses every other recipient.
    console.error('  The shared sender only delivers to the address the Resend account was opened with.');
    console.error('  Verify a domain and set RESEND_FROM, or --to that one address.');
  }

  process.exit(1);
}

const accepted = await response.json();

console.log(`✔ Resend accepted ${accepted.data?.length ?? 0}/${recipients.length} message${recipients.length === 1 ? '' : 's'}.`);
console.log('  Accepted is queued, not delivered — a bounce comes back to the Resend dashboard, not here.');
