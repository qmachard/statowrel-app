/**
 * Neobrutalism design tokens — the single source of truth for the palette, the
 * corner radius, the spacing rhythm and the type scale.
 *
 * Consumed straight as React Native style values: `colors` by the components
 * and by the parts React Navigation paints itself (container theme, stack
 * `contentStyle`), the rest by the `StyleSheet.create` blocks colocated with
 * each component.
 */

/**
 * Four tokens carry the identity — everything else is scaffolding around them:
 * `foreground` for text, `primary` for the main action, `accent` for the
 * accentuated one (today's date, docs/prd.md §5.2) and `background`.
 *
 * `accent` is a saturated red, so it takes white text where `primary` takes
 * black — both land at a 4.58 contrast ratio against their own surface.
 */
export const colors = {
  background: '#f7f0d4',
  foreground: '#000000',
  card: '#ffffff',
  'card-foreground': '#000000',
  primary: '#ffdc59',
  'primary-hover': '#ffd12e',
  'primary-foreground': '#000000',
  secondary: '#000000',
  'secondary-hover': '#1a1a1a',
  'secondary-foreground': '#ffffff',
  // One step down from `background`, the same step the pair had before the
  // palette changed — a recessed surface, not a second background.
  muted: '#eae1bd',
  'muted-foreground': '#6b6355',
  accent: '#d04060',
  'accent-hover': '#b8354f',
  'accent-foreground': '#ffffff',
  destructive: '#e63946',
  'destructive-foreground': '#ffffff',
  border: '#000000',
  input: '#ffffff',
  ring: '#000000',
  /**
   * The two rarity liserés of the StatOwrel card (docs/prd.md §5.5) — they exist
   * to say « this one is rarer than yours »: gold under 25%, holographic violet
   * under 10%. They are frame and badge colours only, never a surface a screen
   * is built on, and the same goes for `notification` below.
   */
  rare: '#e8a317',
  'rare-foreground': '#000000',
  ultra: '#6d4bd8',
  'ultra-foreground': '#ffffff',
  /**
   * The « nouvelles réponses » bead of the Stats calendar (docs/prd.md §5.2).
   *
   * A colour of its own because it has to be **the same on every cell**: the
   * bead hangs off the corner and lands across two surfaces at once — the day's
   * own, and the page behind it — so neither `primary` nor `accent` can carry
   * it without disappearing into one of the cells it sits on. Reading « il y a
   * du neuf » must not depend on which day it is.
   *
   * Like `rare` and `ultra`, a mark and never a surface.
   */
  notification: '#ff7eb6',
};

/**
 * Corners are rounded, not square: the 2px border and the hard offset shadow
 * carry the brutalism, so the radius is free to soften the shape. The ladder
 * starts at 8px — `sm`, what the buttons use — and `DEFAULT` is what a surface
 * takes unless it needs more.
 */
export const radius = {
  none: 0,
  sm: 8,
  DEFAULT: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  full: 9999,
};

/** Every neobrutalist surface carries the same thick border. */
export const borderWidth = 2;

/**
 * Spacing rhythm — one step is 4px, so `spacing(5)` is the 20px page padding and
 * `spacing(0.5)` the 2px focus gap. Padding, margins and `gap` all measure in
 * these steps, which is what keeps the screens on a single grid.
 */
export const spacing = (steps: number) => steps * 4;

/**
 * The horizontal padding of a screen — the gutter every full-width surface
 * lines up on, and the one a full-bleed strip has to bleed back through.
 */
export const pagePadding = spacing(5);

export const fonts = {
  head: 'ArchivoBlack_400Regular',
  sans: 'SpaceGrotesk_400Regular',
};

export const fontSize = {
  '2xs': 10,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '7xl': 72,
};

/**
 * Hard offset shadows — no blur — the neobrutalism signature look. The offsets
 * match the translation a pressed surface uses to sink into its own shadow:
 * `md` (4px) pairs with the `SUNK` transform in `src/components/Button.tsx`.
 *
 * CSS `box-shadow` strings, because that is exactly what React Native's own
 * `boxShadow` style prop takes — see `src/design/shadows.ts`.
 */
export const shadows = {
  xs: '1px 1px 0 0 #000',
  sm: '2px 2px 0 0 #000',
  DEFAULT: '3px 3px 0 0 #000',
  md: '4px 4px 0 0 #000',
  lg: '6px 6px 0 0 #000',
  xl: '10px 10px 0 1px #000',
  '2xl': '16px 16px 0 1px #000',
  /** Cast upwards, for a surface that comes from the bottom of the screen — the sheets of docs/prd.md §5.4. */
  up: '0 -6px 0 0 #000',
};
