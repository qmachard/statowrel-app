/**
 * The palette — the single source of truth for colours.
 *
 * Read both by `tailwind.config.js` (so `className` utilities exist) and by the
 * app at runtime, since a sticker icon takes a fill string rather than a class.
 * Plain CommonJS so the Tailwind config, loaded by Node outside the Babel
 * pipeline, can require it too.
 *
 * Four inks and nothing else: cream paper, golden yellow, bubblegum pink, and
 * black for every outline. A fifth colour would have to earn its place.
 */
module.exports = {
  background: '#fdf3e3',
  foreground: '#000000',
  card: '#ffffff',
  'card-foreground': '#000000',
  primary: '#f5c518',
  'primary-hover': '#e0b30c',
  'primary-foreground': '#000000',
  secondary: '#000000',
  'secondary-foreground': '#ffffff',
  muted: '#eee3cf',
  'muted-foreground': '#6b6355',
  accent: '#fbe6a8',
  'accent-foreground': '#000000',
  // The second sticker fill, paired with `primary` yellow: what an otherwise
  // yellow screen uses to mark the one thing that is not just another day.
  pop: '#f58fe0',
  'pop-foreground': '#000000',
  destructive: '#e63946',
  'destructive-foreground': '#ffffff',
  border: '#000000',
  input: '#ffffff',
  ring: '#000000',
};
