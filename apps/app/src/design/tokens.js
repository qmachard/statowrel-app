/**
 * Neobrutalism design tokens — the single source of truth for colors and the
 * corner radius.
 *
 * Written in CommonJS because `tailwind.config.js` has to `require()` it (no
 * TypeScript loader there), while TypeScript imports it for the values React
 * Navigation needs as plain JS: the container theme, the tab bar and the stack
 * `contentStyle`. Keeping one copy stops the Tailwind theme and the navigator
 * chrome from drifting apart.
 */
const colors = {
  background: '#fff7e8',
  foreground: '#000000',
  card: '#ffffff',
  'card-foreground': '#000000',
  primary: '#ffdc58',
  'primary-hover': '#ffd12e',
  'primary-foreground': '#000000',
  secondary: '#000000',
  'secondary-hover': '#1a1a1a',
  'secondary-foreground': '#ffffff',
  muted: '#efe7d6',
  'muted-foreground': '#6b6355',
  accent: '#ffe7a3',
  'accent-foreground': '#000000',
  destructive: '#e63946',
  'destructive-foreground': '#ffffff',
  border: '#000000',
  input: '#ffffff',
  ring: '#000000',
};

/**
 * Corners are rounded, not square: the 2px border and the hard offset shadow
 * carry the brutalism, so the radius is free to soften the shape. The ladder
 * starts at 8px — `sm`, what the buttons use — and `DEFAULT` is what a surface
 * takes unless it needs more.
 */
const radius = {
  none: '0px',
  sm: '8px',
  DEFAULT: '12px',
  md: '16px',
  lg: '20px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '40px',
  full: '9999px',
};

/**
 * Hard offset shadows — no blur — the neobrutalism signature look. The offsets
 * match the translation a pressed surface uses to sink into its own shadow:
 * `md` (4px) pairs with the 4px `SUNK` transform in `src/components/Button.tsx`.
 *
 * These are CSS `box-shadow` strings, which is what both consumers want:
 * Tailwind's `boxShadow` theme, and React Native's own `boxShadow` style prop
 * (see `src/design/shadows.ts` for why components use the latter).
 */
const shadows = {
  xs: '1px 1px 0 0 #000',
  sm: '2px 2px 0 0 #000',
  DEFAULT: '3px 3px 0 0 #000',
  md: '4px 4px 0 0 #000',
  lg: '6px 6px 0 0 #000',
  xl: '10px 10px 0 1px #000',
  '2xl': '16px 16px 0 1px #000',
};

module.exports = { colors, radius, shadows };
