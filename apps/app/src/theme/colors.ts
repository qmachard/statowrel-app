import palette from './palette.json';

/**
 * The four inks of the design system — and the only place a hex literal lives.
 *
 * The values sit in `palette.json` rather than in this file because both worlds
 * have to read them and neither can read the other's module format:
 * `tailwind.config.js` (CommonJS, evaluated by Metro at build time) `require()`s
 * the JSON, and this module imports it for the runtime. A class name styles a
 * `<View>`; an icon takes its colour as a prop — so `text-pink` and
 * `COLORS.pink` must never be able to drift apart.
 */
export const COLORS = palette as Readonly<Record<Ink, string>>;

export type Ink = 'black' | 'yellow' | 'pink' | 'cream';
