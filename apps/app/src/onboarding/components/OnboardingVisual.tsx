import { BellRing } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Card, CardContent } from '@/components/Card';
import { Star } from '@/components/animations';
import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

import { SAMPLE_STATOWREL, type OnboardingSlideKey } from '../copy';

/** Three handles nobody holds — the faces are generated from them (`src/lib/avatars.ts`). */
const SAMPLE_FRIENDS = [ 'lou.martin', 'sacha', 'nina.b' ];

/** The bell's own box, and the icon inside it. */
const BELL_BOX = spacing(30);
const BELL_ICON = spacing(14);

const styles = StyleSheet.create({
  // Tilted the way a sticker lands, which is what keeps the sample from reading
  // as a real result the visitor already has.
  sample: {
    transform: [ { rotate: '-3deg' } ],
  },
  sampleBody: {
    gap: spacing(1),
  },
  sampleSentence: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors['primary-foreground'],
  },
  emphasis: {
    fontFamily: fonts.head,
  },
  sampleLabel: {
    fontFamily: fonts.head,
    fontSize: fontSize['3xl'],
    lineHeight: fontSize['3xl'] * 1.1,
    textTransform: 'uppercase',
    color: colors['primary-foreground'],
  },
  faces: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Overlapped rather than spaced: a group, not a list.
  face: {
    marginLeft: -spacing(3),
  },
  // The accent red of a notification that has just landed — the same one the
  // daily-question banner and today's cell wear.
  bell: {
    height: BELL_BOX,
    width: BELL_BOX,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius['2xl'],
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.accent,
    transform: [ { rotate: '-6deg' } ],
  },
});

/**
 * What sits above each slide's title — one per `OnboardingSlideKey`, kept apart
 * from the wording so either can change without the other.
 */
export const OnboardingVisual = ({ slideKey }: { slideKey: OnboardingSlideKey }) => {
  if (slideKey === 'daily') {
    // Held on its last frame between plays rather than looping: the star is
    // decoration here, and Lottie's own `loop` restarts on the next frame.
    return <Star size="xl" replayDelay={2000} />;
  }

  if (slideKey === 'statowrel') {
    return (
      <Card variant="primary" shadow="lg" style={styles.sample}>
        <CardContent style={styles.sampleBody}>
          <Text style={styles.sampleSentence}>
            Comme <Text style={styles.emphasis}>{SAMPLE_STATOWREL.share}</Text> des gens, tu es un.e
          </Text>
          <Text style={styles.sampleLabel}>{SAMPLE_STATOWREL.label}</Text>
        </CardContent>
      </Card>
    );
  }

  if (slideKey === 'notifications') {
    return (
      <View style={[ styles.bell, shadows.lg ]}>
        <BellRing color={colors['accent-foreground']} size={BELL_ICON} />
      </View>
    );
  }

  return (
    <View style={styles.faces}>
      {SAMPLE_FRIENDS.map((name, index) => (
        <Avatar key={name} name={name} size="xl" style={index === 0 ? undefined : styles.face} />
      ))}
    </View>
  );
};
