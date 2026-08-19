import type { ViewStyle } from 'react-native';

import { shadows as tokens } from '@/design/tokens';

/**
 * The hard offset shadows, as React Native styles.
 *
 * They go through the `boxShadow` prop (RN 0.76+), which takes the CSS string
 * verbatim and honours its blur radius of `0`, rather than the legacy iOS shadow
 * props (`shadowOffset` / `shadowRadius` / `shadowOpacity` / `elevation`). Those
 * don't reproduce a CSS box-shadow faithfully once the surface has a corner
 * radius — the edge comes out soft, which kills the whole point of a
 * neobrutalist shadow. Same token strings either way — see
 * `src/design/tokens.ts`.
 */
export const shadows = {
  xs: { boxShadow: tokens.xs },
  sm: { boxShadow: tokens.sm },
  DEFAULT: { boxShadow: tokens.DEFAULT },
  md: { boxShadow: tokens.md },
  lg: { boxShadow: tokens.lg },
  xl: { boxShadow: tokens.xl },
  '2xl': { boxShadow: tokens['2xl'] },
} satisfies Record<string, ViewStyle>;
