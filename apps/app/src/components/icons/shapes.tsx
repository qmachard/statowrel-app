import Svg, { Circle, Path, Rect } from 'react-native-svg';

import colors from '@/theme/colors';

/**
 * Hand-built sticker icons — flat fills inside a thick black outline, drawn on
 * a 24×24 grid.
 *
 * They are not an icon font and not a library: an off-the-shelf set is drawn as
 * thin uniform strokes, which disappears next to 2px borders and hard offset
 * shadows. Each shape here is closed and fillable so it can carry a colour and
 * a shadow copy (see `Sticker`), like every other surface on screen.
 */
export interface ShapeProps {
  size?: number;
  /** Flat fill of the shape. */
  fill?: string;
  /** Outline colour — swapped to black for the shadow copy. */
  stroke?: string;
}

export type Shape = (props: ShapeProps) => React.ReactElement;

const STROKE_WIDTH = 2;

function useShape({ size = 24, fill = colors.primary, stroke = colors.border }: ShapeProps) {
  return {
    size,
    common: {
      fill,
      stroke,
      strokeWidth: STROKE_WIDTH,
      strokeLinejoin: 'round' as const,
      strokeLinecap: 'round' as const,
    },
  };
}

/** The streak's flame. */
export const FlameShape: Shape = (props) => {
  const { size, common } = useShape(props);

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 1.6c4.3 4.8 6.9 7.9 6.9 11.6a6.9 6.9 0 0 1-13.8 0C5.1 9.5 7.7 6.4 12 1.6z" {...common} />
      <Path
        d="M12 11.6c1.8 1.9 2.8 3.2 2.8 4.7a2.8 2.8 0 0 1-5.6 0c0-1.5 1-2.8 2.8-4.7z"
        {...common}
        fill={colors.background}
      />
    </Svg>
  );
};

/** The record — the best streak ever reached. */
export const StarShape: Shape = (props) => {
  const { size, common } = useShape(props);

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 1.8l3 6.6 7.2.7-5.4 4.9 1.6 7.1L12 17.4 5.6 21.1l1.6-7.1L1.8 9.1l7.2-.7z"
        {...common}
      />
    </Svg>
  );
};

/** The tally of answered days. */
export const CalendarShape: Shape = (props) => {
  const { size, common } = useShape(props);

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="2.2" y="4.2" width="19.6" height="17.6" {...common} />
      <Path d="M2.2 9.4h19.6" {...common} fill="none" />
      <Path d="M7.4 1.8v4.4M16.6 1.8v4.4" {...common} fill="none" />
      <Path d="M8 15.4l2.6 2.6 5-5" {...common} fill="none" strokeWidth={2.6} />
    </Svg>
  );
};

/** The burst behind a day that is still open. */
export const BurstShape: Shape = (props) => {
  const { size, common } = useShape(props);

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 1.4l2.3 4.4 4.6-2-2 4.6 4.4 2.3-4.4 2.3 2 4.6-4.6-2L12 22.6l-2.3-4.4-4.6 2 2-4.6L2.7 13l4.4-2.3-2-4.6 4.6 2z"
        {...common}
      />
    </Svg>
  );
};

/** Add a friend. */
export const PlusShape: Shape = (props) => {
  const { size, common } = useShape(props);

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 4.5v15M4.5 12h15" {...common} fill="none" strokeWidth={3.4} />
    </Svg>
  );
};

/** Edit the profile. */
export const PencilShape: Shape = (props) => {
  const { size, common } = useShape(props);

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.4 20.6l1.1-4.6L15.7 4.8l3.5 3.5L8 19.5z" {...common} />
      <Path d="M14 6.5l3.5 3.5" {...common} fill="none" />
    </Svg>
  );
};

export const ArrowLeftShape: Shape = (props) => {
  const { size, common } = useShape(props);

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M20 12H4.8M11 5.2L4.2 12l6.8 6.8" {...common} fill="none" strokeWidth={3.2} />
    </Svg>
  );
};

export const ArrowRightShape: Shape = (props) => {
  const { size, common } = useShape(props);

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 12h15.2M13 5.2l6.8 6.8-6.8 6.8" {...common} fill="none" strokeWidth={3.2} />
    </Svg>
  );
};

/** The question mark of a missed day. */
export const QuestionShape: Shape = (props) => {
  const { size, common } = useShape(props);

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8 8.6a4 4 0 1 1 5.6 3.7c-1 .5-1.6 1.3-1.6 2.4v.6"
        {...common}
        fill="none"
        strokeWidth={3}
      />
      <Circle cx="12" cy="19.4" r="1.7" {...common} strokeWidth={0} fill={common.stroke} />
    </Svg>
  );
};
