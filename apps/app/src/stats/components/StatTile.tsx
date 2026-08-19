import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Card, CardContent } from '@/components/Card';
import { colors } from '@/design/tokens';

export interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: number;
  unit: string;
}

/** Secondary counter sitting under the streak block — record, days answered. */
export const StatTile = ({ icon: Icon, label, value, unit }: StatTileProps) => (
  <Card className="flex-1">
    <CardContent className="gap-2">
      <View className="flex-row items-center gap-2">
        <Icon size={16} color={colors['muted-foreground']} />
        <Text className="font-sans text-xs uppercase text-muted-foreground">{label}</Text>
      </View>
      <Text className="font-head text-4xl leading-none text-foreground">{value}</Text>
      <Text className="font-sans text-xs text-muted-foreground">{unit}</Text>
    </CardContent>
  </Card>
);
