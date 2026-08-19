import { Flame } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Card, CardContent } from '@/components/Card';
import { colors } from '@/design/tokens';

export interface StreakCardProps {
  /** `UserData.streak_count` — consecutive days answered on time (docs/prd.md §4.6). */
  count: number;
}

/** The screen's anchor: the streak, full width, unmissable (docs/prd.md §5.2). */
export const StreakCard = ({ count }: StreakCardProps) => {
  const alive = count > 0;

  return (
    <Card variant={alive ? 'primary' : 'muted'} shadow="lg">
      <CardContent className="flex-row items-center justify-between gap-4">
        <View className="shrink">
          <Text className="font-head text-7xl leading-none text-foreground">{count}</Text>
          <Text className="mt-2 font-head text-lg uppercase text-foreground">
            {count === 1 ? 'jour d’affilée' : 'jours d’affilée'}
          </Text>
          {alive ? null : (
            <Text className="mt-1 font-sans text-sm text-muted-foreground">
              Réponds aujourd’hui pour repartir.
            </Text>
          )}
        </View>
        <Flame size={64} color={alive ? colors.foreground : colors['muted-foreground']} />
      </CardContent>
    </Card>
  );
};
