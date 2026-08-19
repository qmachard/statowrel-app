import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

export type PanelTone = 'cream' | 'yellow' | 'pink' | 'black';

export interface PanelProps extends Omit<ViewProps, 'style'> {
  tone?: PanelTone;
  /** Extra Nativewind classes — layout and spacing only, never a colour. */
  className?: string;
  children?: ReactNode;
}

const SURFACE: Record<PanelTone, string> = {
  cream: 'bg-cream',
  yellow: 'bg-yellow',
  pink: 'bg-pink',
  black: 'bg-black',
};

/**
 * The sticker surface every block on the app is cut from: flat ink, thick black
 * outline, hard offset shadow, 10pt corners.
 */
export const Panel = ({ tone = 'cream', className = '', children, ...props }: PanelProps) => (
  <View className={`rounded-panel border-2 border-black shadow-lg ${SURFACE[tone]} ${className}`} {...props}>
    {children}
  </View>
);
