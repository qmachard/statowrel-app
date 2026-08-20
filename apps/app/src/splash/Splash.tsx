import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Star } from '@/components/animations';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';

/**
 * The star runs a touch quicker than its own tempo: the composition lasts three
 * seconds, and a launch screen that holds the app back that long is a launch
 * screen one waits through.
 */
const STAR_SPEED = 1.4;

/**
 * Nothing holds the splash past this, even if the composition never reports its
 * end — a launch screen that can hang is worse than one cut a frame short.
 */
const MAX_HOLD = 3000;

/** How long the splash takes to get out of the way, once the app is ready. */
const FADE_OUT_DURATION = 350;

const styles = StyleSheet.create({
  splash: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  /*
   * The name hangs off the middle of the screen rather than sharing it with the
   * star: the native splash centres its still star on that middle, so anything
   * laid out beside the animated one would push it off the mark and turn the
   * handover into a jump. Half the star's own box, less the empty fifth the
   * composition keeps around it.
   */
  copy: {
    position: 'absolute',
    top: '50%',
    right: 0,
    left: 0,
    marginTop: spacing(26),
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: fonts.head,
    fontSize: fontSize['4xl'],
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  tagline: {
    marginTop: spacing(2),
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    color: colors['muted-foreground'],
  },
});

export interface SplashProps {
  /** False while the app is still getting itself ready — the splash holds until it turns true. */
  ready: boolean;
  /** Fired once the fade is over: nothing of the splash is on screen any more. */
  onHidden: () => void;
}

/**
 * The launch screen: the star of `assets/lottie/star.json`, played once over the
 * brand background, the name under it.
 *
 * It takes over from the *native* splash the moment the JS is up, and the two
 * are cut to the same pattern — same background, the same star at the same size
 * in the same place (`app.config.ts`, `assets/splash-icon.png`). The animation
 * opens on the star already standing there rather than flying it in, so the
 * handover is the still star starting to move, not one screen replacing
 * another.
 *
 * It then holds the app back until two things have happened: the star has
 * played through, and the session has been restored (`ready`) — otherwise the
 * app would flash its sign-in screen at an already-signed-in user. Then it
 * fades out and says so through `onHidden`, which is what unmounts it.
 *
 * The tree it covers is mounted underneath rather than after: the first screen
 * gets to subscribe to Firestore while the star runs, so what the fade reveals
 * is a screen with its data, not a second wait.
 */
export const Splash = ({ ready, onHidden }: SplashProps) => {
  // Held in state rather than in a ref: the value has to survive every render,
  // and a ref read during one is what the React Compiler rules forbid.
  const [ opacity ] = useState(() => new Animated.Value(1));
  const [ played, setPlayed ] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setPlayed(true), MAX_HOLD);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!ready || !played) return;

    const fade = Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_OUT_DURATION,
      useNativeDriver: true,
    });

    fade.start(({ finished }) => {
      if (finished) onHidden();
    });

    return () => fade.stop();
  }, [ ready, played, opacity, onHidden ]);

  return (
    <Animated.View
      // Once it is on its way out it stops swallowing taps: the app underneath
      // is already the one being looked at.
      pointerEvents={played && ready ? 'none' : 'auto'}
      style={[ styles.splash, { opacity } ]}
    >
      <Star size="3xl" speed={STAR_SPEED} onFinish={() => setPlayed(true)} />

      <View style={styles.copy}>
        <Text style={styles.wordmark}>StatOwrel</Text>
        <Text style={styles.tagline}>Une question par jour</Text>
      </View>
    </Animated.View>
  );
};
