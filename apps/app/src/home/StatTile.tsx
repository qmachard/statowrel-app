import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Panel, type PanelTone } from '@/components/Panel';
import { COLORS } from '@/theme/colors';

export interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: number;
  unit: string;
  tone?: PanelTone;
}

/** One of the two secondary tiles sitting under the streak block. */
export const StatTile = ({ icon: Icon, label, value, unit, tone = 'cream' }: StatTileProps) => (
  <Panel tone={tone} className="flex-1 gap-1 px-4 py-4">
    <View className="flex-row items-center gap-2">
      <Icon color={COLORS.black} size={18} strokeWidth={2.5} />
      <Text className="shrink font-sans text-xs uppercase text-black/70" numberOfLines={1}>{label}</Text>
    </View>

    <Text className="font-head text-4xl text-black">{value}</Text>
    <Text className="font-sans text-xs uppercase text-black/70">{unit}</Text>
  </Panel>
);
