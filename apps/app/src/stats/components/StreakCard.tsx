import { Flame } from 'lucide-react-native';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Star } from '@/components/animations';
import { Card, CardContent } from '@/components/Card';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';

export interface StreakCardProps {
  /** `UserData.streak_count` — consecutive days answered on time (docs/prd.md §4.6). */
  count: number;
}

/**
 * Share of the screen the card takes on the strip. Not the whole width: what is
 * left is the peek of the next counter, which is what says the line scrolls.
 */
const SCREEN_SHARE = 0.7;

const FLAME_SIZE = 64;

/** How long the star holds its last frame before running again. */
const STAR_REPLAY_DELAY = 4000;

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(4),
  },
  copy: {
    flexShrink: 1,
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
  star: {
    // The composition keeps a fifth of its canvas empty around the sticker, so
    // it is sized past the card and pulled back through the card's own padding:
    // what is left is ten-odd pixels of air between the drawing and the border.
    marginVertical: -spacing(12),
    marginLeft: -spacing(9),
    marginRight: -spacing(10),
  },
  nudge: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors['muted-foreground'],
  },
});

/** The head of the stats strip: the streak, on nearly the whole screen width. */
export const StreakCard = ({ count }: StreakCardProps) => {
  const { width } = useWindowDimensions();
  const alive = count > 0;

  return (
    <Card variant={alive ? 'primary' : 'muted'} style={{ width: width * SCREEN_SHARE }}>
      <CardContent style={styles.content}>
        <View style={styles.copy}>
          <Text style={styles.label}>Série en cours</Text>
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

        {/*
          * The star runs again every few seconds — it celebrates a streak that
          * is alive. A broken one keeps the extinguished flame: the muted
          * surface and the nudge already say the series stopped, and a cheering
          * star would say the opposite.
          */}
        {alive ? (
          <Star size="xl" replayDelay={STAR_REPLAY_DELAY} style={styles.star} />
        ) : (
          <Flame size={FLAME_SIZE} color={colors['muted-foreground']} />
        )}
      </CardContent>
    </Card>
  );
};
