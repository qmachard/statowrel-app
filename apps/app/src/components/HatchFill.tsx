import { View } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

import { COLORS } from '@/theme/colors';

export interface HatchFillProps {
  /** Pattern tile size in dp — the smaller it is, the denser the hatching. */
  spacing?: number;
  opacity?: number;
}

/**
 * Diagonal black hatching, stretched to fill its parent.
 *
 * Nativewind has no hatching utility and a stack of rotated `<View>`s would need
 * its own clipping layer, so this is one of the rare cases where a drawing
 * primitive beats a class name. Absolutely positioned, so it never affects the
 * layout of the cell it marks.
 */
export const HatchFill = ({ spacing = 6, opacity = 0.35 }: HatchFillProps) => (
  <View className="pointer-events-none absolute inset-0 overflow-hidden">
    <Svg width="100%" height="100%">
      <Defs>
        <Pattern id="hatch" width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <Line x1="0" y1={spacing} x2={spacing} y2="0" stroke={COLORS.black} strokeWidth={1.5} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#hatch)" opacity={opacity} />
    </Svg>
  </View>
);
