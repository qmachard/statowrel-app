/**
 * The brand, as the image renderer needs it — a **mirror** of
 * `apps/app/src/design/tokens.ts`, not an import of it.
 *
 * `@statowrel/functions` does not depend on `@statowrel/app` and must not start
 * to: the app's tokens are React Native style values read by `StyleSheet`, and
 * pulling in that workspace to reach a palette would drag Expo into a Cloud
 * Function bundle. So the four identity colours are copied here, the same way
 * `firestore.rules` copies `USERNAME_PATTERN` — one file, one comment, changed
 * together with the original.
 *
 * What is *not* copied is the geometry. The app's tokens are in points on a
 * ~390pt-wide phone; this canvas is 1080px wide, so every border, radius and
 * spacing below is expressed in the pixels this image is drawn at rather than
 * scaled from a phone. A shadow offset that reads as brutalist at 390pt
 * disappears at 1080.
 */

/** Mirror of `colors` in `apps/app/src/design/tokens.ts` — identity palette only. */
export const palette = {
  background: '#f7f0d4',
  foreground: '#000000',
  card: '#ffffff',
  primary: '#ffdc59',
  'primary-foreground': '#000000',
  muted: '#eae1bd',
  'muted-foreground': '#6b6355',
  accent: '#d04060',
  'accent-foreground': '#ffffff',
} as const;

/**
 * 4:5, the tallest ratio Instagram accepts in a feed carousel (1.91:1 to 4:5).
 *
 * The tallest is the right one and not a matter of taste: the feed scrolls
 * vertically, so height *is* the time a post spends on screen. 1080 is also the
 * width Instagram serves at, which means nothing is resampled.
 *
 * Every carousel item is cropped to the **first** item's ratio, so both slides
 * are drawn at this size or the second one gets cut.
 */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

/** The gutter every block lines up on — the app's `pagePadding`, read at this scale. */
export const CARD_PADDING = 72;

/** Neobrutalism, at 1080px: a border that reads as thick, and a shadow that lands as a hard offset block. */
export const BORDER_WIDTH = 6;
export const SHADOW_OFFSET = 12;

/** The radius ladder, in pixels of this canvas. `full` is anything past half a row's height. */
export const radius = {
  sm: 20,
  DEFAULT: 32,
  lg: 40,
  full: 9999,
} as const;

/**
 * The two font families, registered under these names by `canvasFonts.ts`.
 *
 * Same roles as the app: `head` (Archivo Black) carries every heading and
 * number, `sans` (Space Grotesk) everything read as a sentence.
 */
export const fonts = {
  head: 'StatOwrel Head',
  sans: 'StatOwrel Sans',
  sansMedium: 'StatOwrel Sans Medium',
} as const;

/** The handle printed on both slides — the one place it is written down. */
export const INSTAGRAM_HANDLE = '@statowrel';

/** The brand line, copied from `docs/store-listing.md` §0. One baseline, never reworded per support. */
export const BASELINE = 'Les questions que personne ne pose.\nLes réponses que tout le monde veut.';
