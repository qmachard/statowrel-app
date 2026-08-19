import type * as HapticsModule from 'expo-haptics';

/**
 * The three taps of the double tap (docs/prd.md §4.3): light on selection,
 * heavy then success on validation.
 *
 * `expo-haptics` is a native module, so it is required lazily — the same
 * reasoning as `src/auth/nativeModules.ts`: a dev client built before the
 * dependency was added would otherwise throw at import time and take the whole
 * screen down with it. And every call is fire-and-forget: the PRD wants the
 * validation to go through even when the device has haptics turned off, so a
 * failure here is never allowed to reach the caller.
 */
const loadHaptics = (): typeof HapticsModule | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-haptics') as typeof HapticsModule;
  } catch {
    return null;
  }
};

const play = (feedback: (haptics: typeof HapticsModule) => Promise<void>): void => {
  const haptics = loadHaptics();

  if (haptics === null) {
    return;
  }

  feedback(haptics).catch(() => {
    // Nothing to do about a device that will not buzz.
  });
};

/** First tap — the option is selected, nothing is committed yet. */
export const hapticSelection = (): void => (
  play((haptics) => haptics.impactAsync(haptics.ImpactFeedbackStyle.Light))
);

/**
 * Second tap — the answer is final. The heavy impact lands with the tap, the
 * success notification follows it: two beats, which is what makes the
 * validation feel like a commitment rather than another selection.
 */
export const hapticValidation = (): void => (
  play(async (haptics) => {
    await haptics.impactAsync(haptics.ImpactFeedbackStyle.Heavy);
    await haptics.notificationAsync(haptics.NotificationFeedbackType.Success);
  })
);
