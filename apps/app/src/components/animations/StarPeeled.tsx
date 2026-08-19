import { Animation, type AnimationPresetProps } from './Animation';

/**
 * The outline the star leaves behind when the sticker comes off: the
 * composition's own contour, dashed, with nothing inside it. Meant to be held
 * still (`autoPlay={false}`), and it fills itself with `colors.muted` — it is
 * drawn to sit on the muted card, not on any surface.
 */
export const StarPeeled = (props: AnimationPresetProps) => <Animation {...props} name="star-peeled" />;
