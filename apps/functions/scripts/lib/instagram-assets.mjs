//
// The files the Instagram card renderer reads at runtime, and the one place
// that knows where to put them.
//
// esbuild bundles JavaScript and nothing else, so a `.ttf` and a `.png` cannot
// travel inside `dist/index.js`. They are copied **next to** the bundle
// instead, into `<bundle dir>/assets/`, which is what
// `helpers/canvasFonts.ts` resolves against `__dirname`.
//
// Two callers, one definition: `build.mjs` copies them beside the deploy
// artifact, `render-instagram-card.mjs` beside the throwaway bundle it builds
// to render a card by hand. Neither has to remember the list, so a font added
// to the design cannot end up in the deployed image and missing from the
// preview.
//
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const require = createRequire(import.meta.url);

const FUNCTIONS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * The two families, taken straight out of the `@expo-google-fonts` packages
 * `apps/app` loads them from — never a copy committed here.
 *
 * A font checked into this repo is a font that drifts from the one the app
 * renders in, and the whole point of the card is that somebody who has seen the
 * result screen recognises the post.
 */
const FONT_SPECIFIERS = [
  '@expo-google-fonts/archivo-black/400Regular/ArchivoBlack_400Regular.ttf',
  '@expo-google-fonts/space-grotesk/400Regular/SpaceGrotesk_400Regular.ttf',
  '@expo-google-fonts/space-grotesk/500Medium/SpaceGrotesk_500Medium.ttf',
];

/** The app icon, framed on the call-to-action slide — committed because it is art rather than a dependency. */
const IMAGE_FILES = [ 'src/domains/instagram/assets/icon.png' ];

/** Copies every runtime asset into `<bundleDir>/assets/`. Returns the directory it wrote to. */
export const copyInstagramAssets = async (bundleDir) => {
  const assetsDir = join(bundleDir, 'assets');

  await fs.mkdir(assetsDir, { recursive: true });

  const sources = [
    ...FONT_SPECIFIERS.map((specifier) => require.resolve(specifier)),
    ...IMAGE_FILES.map((file) => join(FUNCTIONS_ROOT, file)),
  ];

  await Promise.all(sources.map((source) => fs.copyFile(source, join(assetsDir, source.split('/').pop()))));

  return assetsDir;
};
