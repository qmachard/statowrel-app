import { Pressable, Text, View } from 'react-native';

/** The four states of a calendar cell (docs/prd.md §5.2). */
export type DayState = 'answered' | 'missed' | 'today' | 'inert';

interface DayCellProps {
  /** Day of the month, or null for a padding slot outside the month. */
  day: number | null;
  state: DayState;
  /** Micro-text shown inside an answered cell — the day's `stat_label`. */
  statLabel?: string;
  /** True when the answer came in after the day closed — completed, streak untouched. */
  late?: boolean;
  onPress?: () => void;
}

const CONTAINER_BY_STATE: Record<DayState, string> = {
  answered: 'border-2 border-border bg-primary shadow-sm',
  missed: 'border-2 border-border bg-background',
  today: 'border-4 border-border bg-pop shadow-sm',
  inert: 'bg-muted',
};

export function DayCell({ day, state, statLabel, late, onPress }: DayCellProps) {
  if (day === null) {
    return <View className="aspect-square flex-1" />;
  }

  const isInteractive = state !== 'inert' && onPress !== undefined;

  return (
    <Pressable
      className="aspect-square flex-1"
      disabled={!isInteractive}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Jour ${day}`}
    >
      <View className={`h-full w-full items-center justify-center px-0.5 ${CONTAINER_BY_STATE[state]}`}>
        <Text
          className={`font-head text-sm ${state === 'inert' ? 'text-muted-foreground' : 'text-foreground'}`}
        >
          {day}
        </Text>

        {state === 'answered' && statLabel ? (
          <Text numberOfLines={1} className="font-sans text-[7px] text-primary-foreground">
            {statLabel}
          </Text>
        ) : null}

        {state === 'answered' && late ? (
          <Text className="font-sans text-[7px] text-muted-foreground">retard</Text>
        ) : null}

        {state === 'missed' ? <Text className="font-head text-xs text-muted-foreground">?</Text> : null}
      </View>
    </Pressable>
  );
}
