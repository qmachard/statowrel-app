//
// Project selection shared by the scripts in this directory.
//
// The project ids live in .firebaserc so a script and `firebase use` never
// drift apart — a script that hardcoded them would keep writing to the old
// project the day one is renamed.
//
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

export const die = (message) => {
  console.error(`✖ ${message}`);
  process.exit(1);
};

/**
 * The project a script writes to: an explicit `--project <id>`, or the
 * `.firebaserc` alias `--production` and friends select (`default` otherwise).
 */
export const resolveProjectId = ({ project, alias }) => {
  if (project) return project;

  let projects;
  try {
    ({ projects } = JSON.parse(readFileSync(resolve(REPO_ROOT, '.firebaserc'), 'utf-8')));
  } catch (error) {
    die(`Could not read .firebaserc (${error.message}). Pass --project <id> instead.`);
  }

  return projects?.[alias] ?? die(`No "${alias}" project in .firebaserc. Pass --project <id> instead.`);
};
