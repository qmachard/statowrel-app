import { Flame } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Card, CardContent } from '@/components/Card';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';

export interface StreakCardProps {
  /** `UserData.streak_count` — consecutive days answered on time (docs/prd.md §4.6). */
  count: number;
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(4),
  },
  copy: {
    flexShrink: 1,
  },
  count: {
    fontFamily: fonts.head,
    fontSize: fontSize['7xl'],
    lineHeight: fontSize['7xl'],
    color: colors.foreground,
  },
  unit: {
    marginTop: spacing(2),
    fontFamily: fonts.head,
    fontSize: fontSize.lg,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  nudge: {
    marginTop: spacing(1),
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors['muted-foreground'],
  },
});

/** The screen's anchor: the streak, full width, unmissable (docs/prd.md §5.2). */
export const StreakCard = ({ count }: StreakCardProps) => {
  const alive = count > 0;

  return (
    <Card variant={alive ? 'primary' : 'muted'} shadow="lg">
      <CardContent style={styles.content}>
        <View style={styles.copy}>
          <Text style={styles.count}>{count}</Text>
          <Text style={styles.unit}>
            {count === 1 ? 'jour d’affilée' : 'jours d’affilée'}
          </Text>
          {alive ? null : (
            <Text style={styles.nudge}>
              Réponds aujourd’hui pour repartir.
            </Text>
          )}
        </View>
        <Flame size={64} color={alive ? colors.foreground : colors['muted-foreground']} />
      </CardContent>
    </Card>
  );
};
