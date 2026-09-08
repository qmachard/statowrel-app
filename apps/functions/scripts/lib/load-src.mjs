//
// Runs the TypeScript in `src/` from an ops script.
//
// The rest of `scripts/` cannot: a `.mjs` does not import TypeScript, which is
// why `send-moderation-digest.mjs` duplicates the digest's filling and shares
// only the HTML file with the function that really sends it. That trade is fine
// for a few string templates and wrong for a few hundred lines of canvas
// drawing — a card previewed by a second implementation says nothing about the
// card that gets posted.
//
// So the entry point is bundled with the same esbuild the deploy artifact is
// built with, into a throwaway directory beside the workspace, and required
// from there. The runtime assets are copied next to it, so `__dirname` resolves
// them exactly as it does in `dist/`.
//
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

import * as esbuild from 'esbuild';

import { copyInstagramAssets } from './instagram-assets.mjs';

const require = createRequire(import.meta.url);

const FUNCTIONS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Gitignored, wiped on every run — nothing here is an artifact anybody keeps. */
const BUNDLE_DIR = join(FUNCTIONS_ROOT, '.script-bundle');

/**
 * Bundles `entry` (a path relative to `apps/functions`) and returns its exports.
 *
 * CommonJS and `require` rather than `import()`: esbuild's CJS output is not
 * statically analysable, so Node's ESM-over-CJS interop would hand back a
 * namespace with `default` alone and no named exports.
 */
export const loadFromSrc = async (entry, { assets = false } = {}) => {
  const manifest = require(join(FUNCTIONS_ROOT, 'package.json'));
  const outfile = join(BUNDLE_DIR, 'bundle.cjs');

  await fs.rm(BUNDLE_DIR, { recursive: true, force: true });
  await fs.mkdir(BUNDLE_DIR, { recursive: true });

  await esbuild.build({
    absWorkingDir: FUNCTIONS_ROOT,
    entryPoints: [ entry ],
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    // Same split as the deploy build: registry packages stay external and
    // resolve out of `node_modules`, `@statowrel/models` travels inlined.
    external: Object.keys(manifest.dependencies),
    loader: { '.html': 'text' },
    logLevel: 'warning',
  });

  if (assets) {
    await copyInstagramAssets(BUNDLE_DIR);
  }

  return require(outfile);
};
