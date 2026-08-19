import { View } from 'react-native';

import colors from '@/theme/colors';

/**
 * Hand-built sticker icons — flat fills inside a thick black outline.
 *
 * Composed out of plain `View`s: rounded corners, rotations and borders, no
 * SVG. `react-native-svg` is a native module, so adding it would force a dev
 * client rebuild for what is, on this screen, a handful of geometric shapes.
 * These reload like any other JS.
 *
 * The outline is not a border but a **black copy underneath**: a shape made of
 * several overlapping views would otherwise show its internal seams wherever
 * two bordered pieces meet. Each shape therefore draws itself twice — solid
 * black at full size, then in colour, inset by the outline width.
 */
export interface ShapeProps {
  size?: number;
  /** Flat fill of the shape. */
  fill?: string;
  /** Outline colour — swapped to black for the shadow copy in `Sticker`. */
  stroke?: string;
}

export type Shape = (props: ShapeProps) => React.ReactElement;

const OUTLINE = 2;

function useLayers({ size = 24, fill = colors.primary, stroke = colors.border }: ShapeProps) {
  return { size, fill, stroke };
}

/**
 * The streak's flame: a square with three rounded corners, turned 45° so the
 * sharp one points up.
 */
export const FlameShape: Shape = (props) => {
  const { size, fill, stroke } = useLayers(props);

  const drop = (color: string, side: number) => (
    <View
      style={{
        width: side,
        height: side,
        backgroundColor: color,
        borderTopLeftRadius: 0,
        borderTopRightRadius: side / 2,
        borderBottomRightRadius: side / 2,
        borderBottomLeftRadius: side / 2,
        transform: [{ rotate: '45deg' }],
      }}
    />
  );

  // A 45°-turned square needs a box of side·√2 to fit; go the other way round.
  const outer = size / Math.SQRT2;
  const inner = outer * 0.44;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {drop(stroke, outer)}
      <View style={{ position: 'absolute' }}>{drop(fill, outer - OUTLINE * 2)}</View>
      <View style={{ position: 'absolute', bottom: size * 0.14 }}>{drop(colors.background, inner)}</View>
    </View>
  );
};

/** The record: an eight-pointed burst, two squares at 45° of each other. */
export const StarShape: Shape = (props) => {
  const { size, fill, stroke } = useLayers(props);

  const burst = (color: string, side: number) => (
    <View style={{ width: side, height: side, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: side, height: side, backgroundColor: color }} />
      <View
        style={{
          position: 'absolute',
          width: side,
          height: side,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );

  // Both squares share a circumradius of side·√2/2, so this is what fits `size`.
  const side = size / Math.SQRT2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {burst(stroke, side)}
      <View style={{ position: 'absolute' }}>{burst(fill, side - OUTLINE * 2)}</View>
    </View>
  );
};

/** The tally of answered days: a calendar page with a tick. */
export const CalendarShape: Shape = (props) => {
  const { size, fill, stroke } = useLayers(props);

  const legWidth = Math.max(2, size * 0.09);
  const legHeight = size * 0.16;
  const bodyTop = legHeight * 0.6;

  return (
    <View style={{ width: size, height: size }}>
      {/* Two legs poking out of the top. */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: size * 0.24,
          width: legWidth,
          height: legHeight * 1.6,
          backgroundColor: stroke,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: size * 0.24,
          width: legWidth,
          height: legHeight * 1.6,
          backgroundColor: stroke,
        }}
      />

      <View
        style={{
          position: 'absolute',
          top: bodyTop,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: stroke,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: bodyTop + OUTLINE,
          left: OUTLINE,
          right: OUTLINE,
          bottom: OUTLINE,
          backgroundColor: fill,
        }}
      />
      {/* The header band, the part of a calendar you recognise it by. */}
      <View
        style={{
          position: 'absolute',
          top: bodyTop + size * 0.2,
          left: OUTLINE,
          right: OUTLINE,
          height: OUTLINE,
          backgroundColor: stroke,
        }}
      />

      <View
        style={{
          position: 'absolute',
          top: bodyTop + size * 0.28,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CheckMark size={size * 0.46} color={stroke} />
      </View>
    </View>
  );
};

function CheckMark({ size, color }: { size: number; color: string }) {
  const thickness = Math.max(2, size * 0.22);

  return (
    <View style={{ width: size, height: size * 0.7 }}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          bottom: thickness * 0.4,
          width: size * 0.45,
          height: thickness,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: thickness * 0.7,
          width: size * 0.75,
          height: thickness,
          backgroundColor: color,
          transform: [{ rotate: '-50deg' }],
        }}
      />
    </View>
  );
}

/** Add a friend. */
export const PlusShape: Shape = (props) => {
  const { size, fill } = useLayers(props);
  const thickness = Math.max(2, size * 0.22);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: thickness, backgroundColor: fill }} />
      <View style={{ position: 'absolute', width: thickness, height: size, backgroundColor: fill }} />
    </View>
  );
};

/** Edit the profile. */
export const PencilShape: Shape = (props) => {
  const { size, fill } = useLayers(props);
  const body = size * 0.26;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ transform: [{ rotate: '45deg' }], alignItems: 'center' }}>
        {/* The tip: a triangle, which in React Native is a view with two
            transparent borders meeting a solid one. */}
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: body / 2,
            borderRightWidth: body / 2,
            borderBottomWidth: body * 0.7,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: fill,
            transform: [{ rotate: '180deg' }],
          }}
        />
        <View style={{ width: body, height: size * 0.62, backgroundColor: fill }} />
      </View>
    </View>
  );
};

function Arrow({ size, color, flip }: { size: number; color: string; flip: boolean }) {
  const thickness = Math.max(2, size * 0.2);
  const arm = size * 0.44;
  // Each arm starts at the shaft's tip and leaves it at 45°, so its centre sits
  // half an arm away along that diagonal.
  const reach = (arm / 2) * Math.SQRT1_2;

  const armStyle = (up: boolean) =>
    ({
      position: 'absolute' as const,
      left: reach - arm / 2,
      top: size / 2 + (up ? -reach : reach) - thickness / 2,
      width: arm,
      height: thickness,
      backgroundColor: color,
      transform: [{ rotate: up ? '-45deg' : '45deg' }],
    });

  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: 'center',
        transform: [{ rotate: flip ? '180deg' : '0deg' }],
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: size / 2 - thickness / 2,
          width: size,
          height: thickness,
          backgroundColor: color,
        }}
      />
      <View style={armStyle(true)} />
      <View style={armStyle(false)} />
    </View>
  );
}

export const ArrowLeftShape: Shape = (props) => {
  const { size, fill } = useLayers(props);

  return <Arrow size={size} color={fill} flip={false} />;
};

export const ArrowRightShape: Shape = (props) => {
  const { size, fill } = useLayers(props);

  return <Arrow size={size} color={fill} flip />;
};
