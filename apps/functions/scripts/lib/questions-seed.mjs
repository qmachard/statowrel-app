//
// The seed catalogue, shared by the two scripts that write questions:
// `seed-questions.mjs` fills the moderation pot from it, and
// `seed-daily-questions.mjs` mints from it the past days the approved pot
// cannot cover. One file, one validation, one notion of "already there".
//
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ulid } from 'ulid';

import { die } from './firebase-project.mjs';

/** The catalogue both scripts default to — an array of `{ question, options: [{ label, stat_label }] }`. */
export const DEFAULT_SEED_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../questions.seed.json');

const isFilledString = (value) => typeof value === 'string' && value.trim() !== '';

/**
 * Rejects the whole file rather than seeding half of it: a malformed entry is a
 * typo in the JSON, not a row to drop silently.
 */
const validateEntries = (entries, file, { minOptions, maxOptions }) => {
  const errors = entries.flatMap((entry, index) => {
    const at = `#${index + 1}${isFilledString(entry?.question) ? ` ("${entry.question}")` : ''}`;
    const options = entry?.options;

    if (!isFilledString(entry?.question)) {
      return [ `${at}: missing "question".` ];
    }

    if (!Array.isArray(options) || options.length < minOptions || options.length > maxOptions) {
      return [ `${at}: needs between ${minOptions} and ${maxOptions} options (got ${Array.isArray(options) ? options.length : 0}).` ];
    }

    return options.flatMap((option, optionIndex) => (
      isFilledString(option?.label) && isFilledString(option?.stat_label)
        ? []
        : [ `${at}, option #${optionIndex + 1}: needs a "label" and a "stat_label".` ]
    ));
  });

  if (errors.length > 0) {
    die(`${errors.length} invalid ${errors.length === 1 ? 'entry' : 'entries'} in ${file}:\n  ${errors.join('\n  ')}`);
  }
};

/** The catalogue at `file`, validated against the model's option bounds. */
export const readSeedEntries = (file, bounds) => {
  let entries;

  try {
    entries = JSON.parse(readFileSync(file, 'utf-8'));
  } catch (error) {
    die(`Could not read ${file} (${error.message}).`);
  }

  if (!Array.isArray(entries)) {
    die(`${file} must hold an array of questions.`);
  }

  validateEntries(entries, file, bounds);

  return entries;
};

/** A question's label, normalised for comparison: case and spacing are out of it. */
export const labelKeyOf = (label) => label.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr-FR');

/**
 * What identifies a question, for these scripts: its label and its option labels.
 *
 * The JSON carries no key Firestore knows about — its numeric `id` is not the
 * document id — and the same label comes back with different options ("Tu
 * prends ta douche…" poses three of them). So the options are part of the key,
 * and case and spacing are out of it.
 */
export const identityOf = (label, optionLabels) => (
  [ label, ...optionLabels ].map(labelKeyOf).join(' ⇥ ')
);

/** The identity of a question already in Firestore, read through the model converter. */
export const documentIdentityOf = (data) => (
  identityOf(data.label ?? '', (data.options ?? []).map((option) => option?.label ?? ''))
);

/** The identity of a catalogue entry, keyed the same way as the documents above. */
export const entryIdentityOf = (entry) => (
  identityOf(entry.question.trim(), entry.options.map((option) => option.label.trim()))
);

/**
 * A catalogue entry turned into the options a question carries — one ULID per
 * option, minted here the way the moderation console mints one as an option is
 * typed in: an answer and its `answer_counts` entry point at it.
 */
export const seedOptionsOf = (entry) => entry.options.map((option) => ({
  id: ulid(),
  label: option.label.trim(),
  stat_label: option.stat_label.trim(),
}));
