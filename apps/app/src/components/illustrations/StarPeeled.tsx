import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing } from '@/design/tokens';

/**
 * The mark the star sticker leaves once it comes off: its silhouette, flat in
 * `colors.background` — the patch of surface the sticker kept from weathering.
 *
 * The two paths are the contour `assets/lottie/star.json` carries around the
 * star and around its trail, in that composition's own 512×512 canvas. Given
 * the same box as the animation, the mark lands exactly where the sticker was.
 * It only reads on a surface that is not the background itself.
 */
const TRAIL = 'M229.5,182 C229.5,182 179.5,215.5 179.5,215.5 C179.5,215.5 72,289 72,289 C72,289 149,295 149,295 C149,295 82,379 82,379 C82,379 168.5,370 168.5,370 C168.5,370 158,414.5 158,414.5 C158,414.5 355.5,344 355.5,344 C355.5,344 229.5,182 229.5,182z';

const STAR = 'M353,344 C353,344 370.5,354 378,350.5 C385.5,347 394,333 392,325 C390,317 375,275 375,275 C375,275 367,259 383.5,249 C400,239 433,212.5 433,212.5 C433,212.5 437,183.5 415.5,183 C394.51,182.51 357,183.5 357,183.5 C357,183.5 343,175.5 340,167.5 C337,159.5 322.5,114.5 322.5,114.5 C322.5,114.5 321,106 302.5,107 C284,108 283,129 283,129 C283,129 273,154.5 273,154.5 C273,154.5 226.5,182 226.5,182 C226.5,182 196,184 196,184 C196,184 174,185.5 177.5,204.5 C181,223.5 199,230.5 199,230.5z';

/** The composition this is traced from — the viewBox has to match it. */
const CANVAS = 512;

export interface StarPeeledProps {
  /** Side of the square canvas, in pixels — the animation's `size` step. */
  size?: number;
  color?: string;
  /** Layout only. */
  style?: StyleProp<ViewStyle>;
}

export const StarPeeled = ({ size = spacing(40), color = colors.background, style }: StarPeeledProps) => (
  <Svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`} style={style}>
    <Path d={TRAIL} fill={color} />
    <Path d={STAR} fill={color} />
  </Svg>
);
