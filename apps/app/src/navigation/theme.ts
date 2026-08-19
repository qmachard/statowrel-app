import { DefaultTheme, type Theme } from '@react-navigation/native';

import { colors } from '@/design/tokens';

/**
 * React Navigation paints the screen background, the card and the header
 * itself, so it needs the neobrutalism palette — the same tokens the screens
 * style themselves with, so the chrome never drifts from the content.
 */
export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.card,
    text: colors.foreground,
    border: colors.border,
    notification: colors.destructive,
  },
};
