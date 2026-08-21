import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, fonts, pagePadding, spacing } from '@/design/tokens';

const styles = StyleSheet.create({
  // The width is the caller's: a page of a horizontal pager has to be exactly
  // the width of the pager, which only the screen knows.
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(8),
    paddingHorizontal: pagePadding,
  },
  // A fixed height rather than the illustration's own, so the three titles land
  // on the same line while paging and the copy does not jump under them.
  visual: {
    height: spacing(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    gap: spacing(3),
  },
  title: {
    textAlign: 'center',
    fontFamily: fonts.head,
    fontSize: fontSize['3xl'],
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  body: {
    textAlign: 'center',
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors['muted-foreground'],
  },
});

export interface OnboardingSlideProps {
  width: number;
  title: string;
  body: string;
  /** What sits above the title — an animation, a sample phrase, a row of faces. */
  visual: ReactNode;
}

/** One page of the carousel: an illustration, a title, a sentence. Nothing to tap. */
export const OnboardingSlide = ({ width, title, body, visual }: OnboardingSlideProps) => (
  <View style={[ styles.slide, { width } ]}>
    <View style={styles.visual}>{visual}</View>

    <View style={styles.text}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  </View>
);
