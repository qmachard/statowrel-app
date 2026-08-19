/**
 * Neobrutalism palette — the single source of truth for colors.
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

module.exports = { colors };
