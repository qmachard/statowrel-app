import { Flame } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Card, CardContent } from '@/components/Card';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';

export interface StreakCardProps {
  /** `UserData.streak_count` — consecutive days answered on time (docs/prd.md §4.6). */
  count: number;
}

const styles = StyleSheet.create({
  card: {
    // Wider than the counters framing it: the streak leads the strip, and the
    // count is set in `7xl` — it needs the room (docs/prd.md §5.2).
    width: spacing(52),
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
    color: colors.foreground,
  },
  count: {
    fontFamily: fonts.head,
    fontSize: fontSize['7xl'],
    lineHeight: fontSize['7xl'],
    color: colors.foreground,
  },
  unit: {
    fontFamily: fonts.head,
    fontSize: fontSize.lg,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  nudge: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors['muted-foreground'],
  },
});

/** The head of the stats strip: the streak, the biggest thing on it (docs/prd.md §5.2). */
export const StreakCard = ({ count }: StreakCardProps) => {
  const alive = count > 0;

  return (
    <Card variant={alive ? 'primary' : 'muted'} shadow="lg" style={styles.card}>
      <CardContent style={styles.content}>
        <View style={styles.heading}>
          <Flame size={16} color={alive ? colors.foreground : colors['muted-foreground']} />
          <Text style={styles.label}>Série en cours</Text>
        </View>

        <Text style={styles.count}>{count}</Text>
        <Text style={styles.unit}>
          {count === 1 ? 'jour d’affilée' : 'jours d’affilée'}
        </Text>

        {alive ? null : (
          <Text style={styles.nudge}>
            Réponds aujourd’hui pour repartir.
          </Text>
        )}
      </CardContent>
    </Card>
  );
};
