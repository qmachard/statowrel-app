import { DAILY_QUESTION_TIME_ZONE, type Identifiable, type QuestionData } from '@statowrel/models';

import type { EmailMessage } from '@/domains/notifications';
import { initFirebase } from '@/libs/firebase-admin';

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

/** « le 12/03/2026 », or nothing at all when the stamp is unreadable — a date is a detail, not a reason to fail the digest. */
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

const textBodyOf = (questions: Identifiable<QuestionData>[], url: string): string => {
  const lines = questions.slice(0, LISTED_QUESTIONS).map((question) => (
    `- « ${question.label} » — ${authorOf(question)}, ${proposedOn(question)}`
  ));

  const remaining = questions.length - lines.length;

  return [
    questions.length === 1
      ? 'Une question attend une décision dans la console de modération.'
      : `${questions.length} questions attendent une décision dans la console de modération.`,
    '',
    ...lines,
    ...(remaining > 0 ? [ `- … et ${remaining} autre${remaining > 1 ? 's' : ''}.` ] : []),
    '',
    `Modérer : ${url}`,
  ].join('\n');
};

const htmlBodyOf = (questions: Identifiable<QuestionData>[], url: string): string => {
  const rows = questions.slice(0, LISTED_QUESTIONS).map((question) => (
    `<li style="margin:0 0 12px;"><strong>${escapeHtml(question.label)}</strong><br />`
    + `<span style="color:#666;">${escapeHtml(authorOf(question))} — ${proposedOn(question)}</span></li>`
  ));

  const remaining = questions.length - rows.length;

  return [
    '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#111;">',
    `<p>${questions.length === 1
      ? 'Une question attend une décision dans la console de modération.'
      : `<strong>${questions.length} questions</strong> attendent une décision dans la console de modération.`}</p>`,
    `<ul style="padding-left:20px;">${rows.join('')}</ul>`,
    ...(remaining > 0 ? [ `<p style="color:#666;">… et ${remaining} autre${remaining > 1 ? 's' : ''}.</p>` ] : []),
    `<p><a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Ouvrir la console</a></p>`,
    '</div>',
  ].join('');
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
