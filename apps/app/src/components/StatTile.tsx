import { Text, View } from 'react-native';

import { Sticker } from '@/components/icons/Sticker';
import type { Shape } from '@/components/icons/shapes';

interface StatTileProps {
  label: string;
  value: string;
  shape: Shape;
  /** Flat fill of the sticker — a palette value. */
  fill: string;
}

/** Secondary figure next to the streak card — record, total answered days. */
export function StatTile({ label, value, shape, fill }: StatTileProps) {
  return (
    <View className="flex-1 border-2 border-border bg-card p-4 shadow-sm">
      <Sticker shape={shape} size={28} fill={fill} offset={2} />
      <Text className="mt-2 font-head text-3xl text-card-foreground">{value}</Text>
      <Text className="font-sans text-xs uppercase text-muted-foreground">{label}</Text>
    </View>
  );
}
