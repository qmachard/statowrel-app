import { Text, View } from 'react-native';

interface StreakCardProps {
  /** Current consecutive days answered on time — `v1_users.streak_count`. */
  count: number;
}

/**
 * The Stats screen's hero block (docs/prd.md §5.2) — full width, hard offset
 * shadow, the day count in `font-head` at display size. At 0 the card drops to
 * `muted` and turns into a call to action rather than a trophy.
 */
export function StreakCard({ count }: StreakCardProps) {
  const isBroken = count === 0;

  return (
    <View
      className={`w-full border-2 border-border p-6 shadow-lg ${isBroken ? 'bg-muted' : 'bg-primary'}`}
    >
      <View className="flex-row items-center justify-between">
        <View className="shrink">
          <Text
            className={`font-head text-7xl leading-tight ${isBroken ? 'text-muted-foreground' : 'text-primary-foreground'}`}
          >
            {count}
          </Text>
          <Text
            className={`font-head text-2xl ${isBroken ? 'text-muted-foreground' : 'text-primary-foreground'}`}
          >
            {count === 1 ? "jour d'affilée" : "jours d'affilée"}
          </Text>
        </View>
        <Text className="text-6xl">{isBroken ? '🥶' : '🔥'}</Text>
      </View>

      {isBroken ? (
        <Text className="mt-4 font-sans text-base text-muted-foreground">
          Réponds aujourd&apos;hui pour repartir.
        </Text>
      ) : null}
    </View>
  );
}
