import type { LucideIcon } from '@/components/icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card, CardContent } from '@/components/Card';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';

export interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: number;
  unit: string;
}

const styles = StyleSheet.create({
  card: {
    // A fixed width, not `flex: 1`: the tile lives on a horizontally scrolling
    // strip now, where a flexed child would collapse to its content.
    width: spacing(40),
  },
  content: {
    gap: spacing(2),
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    color: colors['muted-foreground'],
  },
  value: {
    fontFamily: fonts.head,
    fontSize: fontSize['4xl'],
    lineHeight: fontSize['4xl'],
    color: colors.foreground,
  },
  unit: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors['muted-foreground'],
  },
});

/** Secondary counter trailing the streak on the stats strip — record, days answered. */
export const StatTile = ({ icon: Icon, label, value, unit }: StatTileProps) => (
  <Card style={styles.card}>
    <CardContent style={styles.content}>
      <View style={styles.heading}>
        <Icon size={16} color={colors['muted-foreground']} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.unit}>{unit}</Text>
    </CardContent>
  </Card>
);
