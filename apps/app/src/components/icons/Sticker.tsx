import { View } from 'react-native';

import type { Shape } from '@/components/icons/shapes';
import colors from '@/theme/colors';

interface StickerProps {
  shape: Shape;
  size: number;
  fill: string;
  /** Hard offset of the shadow copy, in px. 0 disables it. */
  offset?: number;
}

/**
 * A shape with the same hard offset shadow every other surface carries.
 *
 * `shadow-*` can't do this: a React Native shadow follows the view's rectangle,
 * so an icon would get a shadowed square instead of a shadowed silhouette. The
 * shape is drawn twice — once solid black, offset, then in colour on top.
 */
export function Sticker({ shape: Shape, size, fill, offset = 3 }: StickerProps) {
  return (
    <View style={{ width: size + offset, height: size + offset }}>
      {offset > 0 ? (
        <View style={{ position: 'absolute', left: offset, top: offset }}>
          <Shape size={size} fill={colors.border} stroke={colors.border} />
        </View>
      ) : null}
      <View style={{ position: 'absolute', left: 0, top: 0 }}>
        <Shape size={size} fill={fill} />
      </View>
    </View>
  );
}
