import LottieView from 'lottie-react-native';
import { useEffect, useRef, type Ref } from 'react';
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
export type AnimationSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZE = StyleSheet.create({
  sm: { width: spacing(12), height: spacing(12) },
  md: { width: spacing(20), height: spacing(20) },
  lg: { width: spacing(32), height: spacing(32) },
  xl: { width: spacing(40), height: spacing(40) },
  '2xl': { width: spacing(48), height: spacing(48) },
}) satisfies Record<AnimationSize, ViewStyle>;

export interface AnimationProps {
  name: AnimationName;
  size?: AnimationSize;
  loop?: boolean;
  autoPlay?: boolean;
  speed?: number;
  /**
   * Milliseconds to hold the last frame before playing again. `loop` restarts
   * on the very next frame, which is relentless on an animation that just sits
   * on a screen — this is its patient twin, and it leaves `loop` off.
   */
  replayDelay?: number;
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
  replayDelay,
  onFinish,
  style,
  ref,
}: AnimationProps) => {
  // The replay drives the view itself, so the component keeps its own handle
  // and hands the caller's `ref` the same instance.
  const view = useRef<LottieView | null>(null);
  const replay = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(replay.current), []);

  const handleFinish = () => {
    onFinish?.();

    if (replayDelay === undefined) return;

    // `play()` alone resumes from where the animation stopped — the last frame,
    // where there is nothing left to play. Rewinding first is what replays it.
    replay.current = setTimeout(() => {
      view.current?.reset();
      view.current?.play();
    }, replayDelay);
  };

  return (
    <LottieView
      ref={(instance) => {
        view.current = instance;

        if (typeof ref === 'function') {
          ref(instance);
        } else if (ref) {
          ref.current = instance;
        }
      }}
      source={ANIMATION_SOURCES[name]}
      autoPlay={autoPlay}
      loop={loop}
      speed={speed}
      onAnimationFinish={handleFinish}
      resizeMode="contain"
      style={[ SIZE[size], style ]}
    />
  );
};

/** What a preset takes: everything but the composition it already picked. */
export type AnimationPresetProps = Omit<AnimationProps, 'name'>;
