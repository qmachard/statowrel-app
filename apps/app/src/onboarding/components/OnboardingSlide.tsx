import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, fonts, pagePadding, spacing } from '@/design/tokens';

/** Tight, the way a headline is set — the titles are two or three lines each. */
const TITLE_LINE_HEIGHT = fontSize['3xl'] * 1.1;

/** What the longest title takes on a phone; see `titleBox`. */
const TITLE_LINES = 3;

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
  // A fixed height rather than each illustration's own, so the five
  // illustrations land on the same line while paging. It is the tallest of them
  // — the star at `3xl` — so nothing has to be cropped.
  visual: {
    height: spacing(60),
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    gap: spacing(3),
  },
  // The titles run from one line (« C'est parti. ») to three (« Une question
  // que personne n'ose poser. »), so the room for the longest is reserved on
  // every slide and they are hung from its bottom: what has to hold still while
  // paging is the sentence under them, not the top of the headline. A title
  // that overflows on a narrow phone simply pushes it down on that slide alone
  // — `minHeight`, never a fixed one.
  titleBox: {
    minHeight: TITLE_LINE_HEIGHT * TITLE_LINES,
    justifyContent: 'flex-end',
  },
  title: {
    textAlign: 'center',
    fontFamily: fonts.head,
    fontSize: fontSize['3xl'],
    lineHeight: TITLE_LINE_HEIGHT,
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
      <View style={styles.titleBox}>
        <Text style={styles.title}>{title}</Text>
      </View>

      <Text style={styles.body}>{body}</Text>
    </View>
  </View>
);
