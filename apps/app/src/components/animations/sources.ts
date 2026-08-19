import type { AnimationObject } from 'lottie-react-native';

import successCheck from '../../../assets/lottie/success-check.json';
import successCircle from '../../../assets/lottie/success-circle.json';

/**
 * Every Lottie composition the app ships, keyed by the name a component asks
 * for. Metro inlines the JSON in the bundle, so nothing is fetched at runtime.
 *
 * Adding an animation is a file in `assets/lottie/` plus a line here — the
 * `Animation` component and its presets need no change.
 */
export const ANIMATION_SOURCES = {
  'success-check': successCheck,
  'success-circle': successCircle,
} satisfies Record<string, AnimationObject>;

export type AnimationName = keyof typeof ANIMATION_SOURCES;
