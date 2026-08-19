/**
 * Builds the deployable artifact into `dist/` — the directory `firebase.json`
 * points at, not this workspace.
 *
 * `firebase deploy` uploads the functions source directory on its own and runs
 * `npm install` on the build machine, with no access to the monorepo. A
 * `@statowrel/models` entry in the uploaded manifest is therefore fatal: it is a
 * private workspace package the registry has never heard of, and npm fails on it
 * whichever dependency key it sits under — `--omit=dev` still resolves dev edges.
 *
 * So the artifact carries no workspace reference at all. esbuild inlines
 * `@statowrel/models` into the bundle, and the generated manifest lists only the
 * registry dependencies, which stay external and are installed as usual.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';

import * as esbuild from 'esbuild';

const require = createRequire(import.meta.url);
const manifest = require('../package.json');

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'dist');

/** Cloud Functions reads `engines.node` to pick the runtime, and `main` to load the code. */
const writeArtifactManifest = async () => {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, 'package.json'),
    `${JSON.stringify({
      name: manifest.name,
      version: manifest.version ?? '0.0.0',
      private: true,
      main: 'index.js',
      engines: manifest.engines,
      dependencies: manifest.dependencies,
    }, null, 2)}\n`,
  );
};

const options = {
  absWorkingDir: root,
  entryPoints: [ 'src/index.ts' ],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  // Everything on the registry is installed by the build machine from the
  // generated manifest; only the workspace package has to travel inlined.
  external: Object.keys(manifest.dependencies),
};

await writeArtifactManifest();

if (process.argv.includes('--watch')) {
  const context = await esbuild.context(options);

  await context.watch();
} else {
  await esbuild.build(options);
}
