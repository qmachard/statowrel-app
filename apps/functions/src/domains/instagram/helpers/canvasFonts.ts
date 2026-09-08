import path from 'node:path';

import { GlobalFonts } from '@napi-rs/canvas';

import { fonts } from './brand';

/**
 * Where the `.ttf` files sit at runtime.
 *
 * `__dirname` is the directory of the **bundle**, not of this source file:
 * esbuild collapses `src/` into a single `dist/index.js`, and
 * `scripts/build.mjs` copies the fonts to `dist/assets/` beside it. The ops
 * script bundles this same code into its own directory and copies the same
 * assets next to it, so one expression serves both — there is no environment
 * variable to remember to set.
 *
 * The fonts are **not** committed: they come from `@expo-google-fonts/*`, the
 * very packages `apps/app` loads them from, and are copied out of
 * `node_modules` at build time. A second copy in git is a second copy to drift.
 */
export const ASSETS_DIR = path.join(__dirname, 'assets');

const FONT_FILES = [
  { file: 'ArchivoBlack_400Regular.ttf', family: fonts.head },
  { file: 'SpaceGrotesk_400Regular.ttf', family: fonts.sans },
  { file: 'SpaceGrotesk_500Medium.ttf', family: fonts.sansMedium },
];

let registered = false;

/**
 * Registers the two families with the canvas, once per process.
 *
 * `@napi-rs/canvas` resolves a family name against fonts it has been *given* —
 * a Cloud Functions container ships none, so an unregistered family silently
 * falls back to whatever the bundled fallback is and the image comes out in the
 * wrong typeface rather than failing. Which is why a refused registration
 * throws here: a card in the wrong font is worse than a card that did not go
 * out, since nobody is watching the account at 09:00.
 */
export const registerBrandFonts = (): void => {
  if (registered) {
    return;
  }

  for (const { file, family } of FONT_FILES) {
    if (!GlobalFonts.registerFromPath(path.join(ASSETS_DIR, file), family)) {
      throw new Error(`Could not register ${file} from ${ASSETS_DIR} — was the build's font copy step skipped?`);
    }
  }

  registered = true;
};
