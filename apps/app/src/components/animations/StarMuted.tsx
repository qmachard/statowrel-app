import { Animation, type AnimationPresetProps } from './Animation';

/**
 * The star drained of its colors — every fill of `Star` on its own grey, the
 * outlines and the sticker contour untouched. Meant to be held still
 * (`autoPlay={false}`): a state that stopped, not one that is playing.
 */
export const StarMuted = (props: AnimationPresetProps) => <Animation {...props} name="star-muted" />;
