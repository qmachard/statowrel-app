import { Animation, type AnimationPresetProps } from './Animation';

/**
 * The mark the star leaves once the sticker comes off: its silhouette, flat in
 * `colors.background` — the patch of surface the sticker kept from weathering.
 * Meant to be held still (`autoPlay={false}`), and it only reads on a surface
 * that is not the background itself.
 */
export const StarPeeled = (props: AnimationPresetProps) => <Animation {...props} name="star-peeled" />;
