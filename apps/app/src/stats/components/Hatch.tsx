import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

import { colors } from '@/design/tokens';

/**
 * Diagonal hatching, filling its parent. The missed-day cell of docs/prd.md §5.2
 * is the only place that needs it, and it is the one fill a plain background
 * colour can't express — a repeating pattern.
 */
export const Hatch = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <Svg width="100%" height="100%">
      <Defs>
        <Pattern id="hatch" width={7} height={7} patternUnits="userSpaceOnUse">
          <Line x1={0} y1={7} x2={7} y2={0} stroke={colors.border} strokeWidth={1.5} strokeOpacity={0.35} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#hatch)" />
    </Svg>
  </View>
);
