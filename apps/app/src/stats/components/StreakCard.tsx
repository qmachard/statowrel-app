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
    // A touch wider than the counters framing it — it leads the strip — but on
    // the same type scale, so the whole line stays one height (docs/prd.md §5.2).
    width: spacing(44),
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
    fontSize: fontSize['4xl'],
    lineHeight: fontSize['4xl'],
    color: colors.foreground,
  },
  unit: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.foreground,
  },
  nudge: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors['muted-foreground'],
  },
});

/** The head of the stats strip: the streak, on the same type scale as the counters after it. */
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
