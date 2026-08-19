import { Text, View } from 'react-native';

import { Sticker } from '@/components/icons/Sticker';
import { FlameShape } from '@/components/icons/shapes';
import colors from '@/theme/colors';

interface StreakCardProps {
  /** Current consecutive days answered on time — `v1_users.streak_count`. */
  count: number;
}

/**
 * The Stats screen's hero block (docs/prd.md §5.2) — full width, hard offset
 * shadow, the day count in `font-head` at display size. At 0 the card drops to
 * `muted` and the flame goes out: a call to action rather than a trophy.
 */
export function StreakCard({ count }: StreakCardProps) {
  const isBroken = count === 0;
  const textColor = isBroken ? 'text-muted-foreground' : 'text-primary-foreground';

  return (
    <View
      className={`w-full border-2 border-border p-6 shadow-lg ${isBroken ? 'bg-muted' : 'bg-primary'}`}
    >
      <View className="flex-row items-center justify-between">
        <View className="shrink">
          <Text className={`font-head text-7xl leading-tight ${textColor}`}>{count}</Text>
          <Text className={`font-head text-2xl ${textColor}`}>
            {count === 1 ? "jour d'affilée" : "jours d'affilée"}
          </Text>
        </View>

        <Sticker shape={FlameShape} size={68} fill={isBroken ? colors.muted : colors.pop} />
      </View>

      {isBroken ? (
        <Text className="mt-4 font-sans text-base text-muted-foreground">
          Réponds aujourd&apos;hui pour repartir.
        </Text>
      ) : null}
    </View>
  );
}
