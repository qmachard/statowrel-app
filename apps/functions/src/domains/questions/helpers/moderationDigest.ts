import { DAILY_QUESTION_TIME_ZONE, type Identifiable, type QuestionData } from '@statowrel/models';

import type { EmailMessage } from '@/domains/notifications';
import { initFirebase } from '@/libs/firebase-admin';

import template from '../emails/moderationDigest.fr.html';

/**
 * How many questions the mail names before it stops counting them out.
 *
 * A digest is a nudge to open the console, not the console itself: past a
 * screenful, the list stops being read and the count is the only thing that
 * still says anything.
 */
const LISTED_QUESTIONS = 20;

/** Escapes what goes into the HTML body — every label in it is text somebody typed into the app. */
const escapeHtml = (text: string): string => (
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
);

/**
 * Replaces the `{{KEY}}` placeholders `values` names, and leaves every other
 * one standing.
 *
 * A function replacement rather than a string one, so what lands is taken
 * literally: a `$&` in a question's label is a question's label, not a
 * backreference. Nothing rescans what it inserted either, which is what lets
 * the caller run this over the template *before* any user content is in it and
 * over each row *after*.
 */
const fillPlaceholders = (source: string, values: Record<string, string>): string => (
  source.replace(/\{\{(\w+)\}\}/g, (placeholder, key: string) => values[key] ?? placeholder)
);

/**
 * Replaces one `<!--NAME-->…<!--/NAME-->` block of the template with whatever
 * `render` makes of the fragment inside it.
 *
 * The markers sit around a *sample* row rather than at an insertion point, so
 * the template file stays openable in a browser and reviewable as the mail it
 * is — the repetition is the only thing code adds.
 */
const fillBlock = (source: string, name: string, render: (fragment: string) => string): string => {
  const block = new RegExp(`[ \\t]*<!--${name}-->\\s*([\\s\\S]*?)\\s*<!--/${name}-->[ \\t]*\\n?`);
  const found = source.match(block);

  if (found === null) {
    throw new Error(`The moderation digest template has no ${name} block`);
  }

  return source.replace(block, () => render(found[1]));
};

/**
 * The moderation console's own URL, derived from the project rather than
 * configured.
 *
 * Firebase Hosting always serves a project on `<projectId>.web.app`, and
 * `firebase.json` rewrites `/admin` onto the console (the root of the site is
 * the presentation page). A custom domain would be one more thing to keep in
 * step with a deploy; the day there is one, it goes here.
 */
const moderationConsoleUrl = (): string => {
  const projectId = process.env.GCLOUD_PROJECT ?? initFirebase().options.projectId;

  return `https://${projectId}.web.app/admin`;
};

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: DAILY_QUESTION_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** « 12/03/2026 », or nothing at all when the stamp is unreadable — a date is a detail, not a reason to fail the digest. */
const proposedOn = (question: Identifiable<QuestionData>): string => {
  const date = new Date(question.created_at);

  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date);
};

/** The handle the question carries, or a blank credit for the ones nobody proposed — a seeded catalogue entry has no author. */
const authorOf = (question: Identifiable<QuestionData>): string => question.author_username ?? 'auteur inconnu';

const subjectOf = (count: number): string => (
  count === 1
    ? '1 question à modérer sur StatOwrel'
    : `${count} questions à modérer sur StatOwrel`
);

const introOf = (count: number): string => (
  count === 1
    ? 'Une question attend une décision dans la console de modération.'
    : `${count} questions attendent une décision dans la console de modération.`
);

const moreOf = (remaining: number): string => (
  `… et ${remaining} autre${remaining > 1 ? 's' : ''}.`
);

const textBodyOf = (questions: Identifiable<QuestionData>[], url: string): string => {
  const lines = questions.slice(0, LISTED_QUESTIONS).map((question) => (
    `- « ${question.label} » — ${authorOf(question)}, ${proposedOn(question)}`
  ));

  const remaining = questions.length - lines.length;

  return [
    introOf(questions.length),
    '',
    ...lines,
    ...(remaining > 0 ? [ `- ${moreOf(remaining)}` ] : []),
    '',
    `Modérer : ${url}`,
  ].join('\n');
};

/**
 * The branded body, off `emails/moderationDigest.fr.html` — one copy of the
 * wording, inlined into the bundle by esbuild's `text` loader and read from
 * disk by `scripts/send-moderation-digest.mjs`, so what a dry run shows is what
 * Wednesday morning sends.
 */
const htmlBodyOf = (questions: Identifiable<QuestionData>[], url: string): string => {
  const listed = questions.slice(0, LISTED_QUESTIONS);
  const remaining = questions.length - listed.length;

  // The outer placeholders go in first, while nothing user-written is in the
  // string yet; the rows are spliced after, and never rescanned. A label
  // reading `{{URL}}` is then a label and not a link.
  let body = fillPlaceholders(template, { INTRO: escapeHtml(introOf(questions.length)), URL: url });

  body = fillBlock(body, 'QUESTION_ROW', (row) => listed.map((question) => fillPlaceholders(row, {
    LABEL: escapeHtml(question.label),
    AUTHOR: escapeHtml(authorOf(question)),
    DATE: proposedOn(question),
  })).join(''));

  body = fillBlock(body, 'MORE_ROW', (row) => (
    remaining > 0 ? fillPlaceholders(row, { MORE: escapeHtml(moreOf(remaining)) }) : ''
  ));

  // What is left of the comments is the note to whoever edits the template, and
  // a moderator opening the source of their mail has no use for it. The block
  // markers are already gone, consumed above; nothing here relies on a
  // conditional comment, which this would eat too.
  body = body.replace(/[ \t]*<!--[\s\S]*?-->[ \t]*\n?/g, '');

  const unfilled = body.match(/\{\{(\w+)\}\}/);

  if (unfilled !== null) {
    // A placeholder nobody fills would ship as `{{FOO}}` in somebody's inbox,
    // which is the kind of thing a template edit introduces silently.
    throw new Error(`The moderation digest template left ${unfilled[0]} unfilled`);
  }

  return body;
};

/**
 * One message per moderator, all carrying the same digest.
 *
 * One per recipient rather than one mail with everybody in `to`: a moderator
 * has no reason to see who else moderates, and a single message would put every
 * address in every inbox.
 */
export const buildModerationDigest = (
  questions: Identifiable<QuestionData>[],
  recipients: string[],
): EmailMessage[] => {
  const url = moderationConsoleUrl();
  const subject = subjectOf(questions.length);
  const text = textBodyOf(questions, url);
  const html = htmlBodyOf(questions, url);

  return recipients.map((to) => ({ to, subject, text, html }));
};
