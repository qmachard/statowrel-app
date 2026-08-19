import LottieView from 'lottie-react-native';
import type { Ref } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/design/tokens';

import { ANIMATION_SOURCES, type AnimationName } from './sources';

/**
 * A Lottie composition from `assets/lottie/`, sized on the spacing rhythm.
 *
 * The compositions are square (512×512), so a single `size` step drives both
 * dimensions and `style` stays layout-only — same contract as `Card`.
 *
 * It plays once on mount by default: these are feedback animations (answering a
 * question, docs/prd.md §4.3), not decoration. Pass the `ref` through to reach
 * the imperative API — `play()`, `reset()`, `pause()`, `resume()` — when the
 * screen replays the animation without remounting it.
 */
export type AnimationSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE = StyleSheet.create({
  sm: { width: spacing(12), height: spacing(12) },
  md: { width: spacing(20), height: spacing(20) },
  lg: { width: spacing(32), height: spacing(32) },
  xl: { width: spacing(48), height: spacing(48) },
}) satisfies Record<AnimationSize, ViewStyle>;

export interface AnimationProps {
  name: AnimationName;
  size?: AnimationSize;
  loop?: boolean;
  autoPlay?: boolean;
  speed?: number;
  onFinish?: () => void;
  /** Layout only — the animation measures itself through `size`. */
  style?: StyleProp<ViewStyle>;
  ref?: Ref<LottieView>;
}

export const Animation = ({
  name,
  size = 'md',
  loop = false,
  autoPlay = true,
  speed,
  onFinish,
  style,
  ref,
}: AnimationProps) => (
  <LottieView
    ref={ref}
    source={ANIMATION_SOURCES[name]}
    autoPlay={autoPlay}
    loop={loop}
    speed={speed}
    onAnimationFinish={onFinish}
    resizeMode="contain"
    style={[ SIZE[size], style ]}
  />
);

/** What a preset takes: everything but the composition it already picked. */
export type AnimationPresetProps = Omit<AnimationProps, 'name'>;
