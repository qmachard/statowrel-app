import { colors } from '@/design/tokens';

/**
 * The avatar everybody has before they have one: a DiceBear « patchwork »
 * seeded on the handle, so a friend is recognised by their picture from the
 * first time they appear, and the same handle always draws the same one.
 *
 * Seeded rather than random and rendered rather than stored: nothing has to be
 * written, uploaded or backfilled for an account to have a face, and the URL is
 * derived from the handle on both sides of a friendship without either having
 * to copy anything.
 *
 * The palette is the app's, not DiceBear's default: the background is the
 * `background` token, and the three fabric ramps stay in the identity's
 * colours.
 */
const DICEBEAR = 'https://api.dicebear.com/10.x/patchwork/svg';

const PALETTE: Record<string, string> = {
  // The token, without its `#` — DiceBear takes bare hex.
  backgroundColor: colors.background.replace('#', '').toUpperCase(),
  fabricAColor: '69D3E8,7FBC8C',
  fabricBColor: 'E2A017,FF68B5',
  fabricCColor: 'FF68B5,9723C9',
};

// The comma between two colours of a ramp stays a comma: DiceBear reads a
// percent-encoded one as part of the value, not as the separator.
const QUERY = Object.entries(PALETTE)
  .map(([ option, value ]) => `${option}=${value}`)
  .join('&');

/** The generated avatar of a handle — an SVG URL, stable for a given seed. */
export const generatedAvatarUri = (seed: string) => (
  `${DICEBEAR}?${QUERY}&seed=${encodeURIComponent(seed)}`
);
