import { Flame } from 'lucide-react-native';
import { Text } from 'react-native';

import { Panel } from '@/components/Panel';
import { COLORS } from '@/theme/colors';

export interface StreakBlockProps {
  streakCount: number;
}

/**
 * The screen's headline number (docs/prd.md §5.2).
 *
 * A running streak is pink — it is the thing that is not an ordinary day. A
 * broken one drops back to cream: nothing to celebrate, just an invitation to
 * start again.
 */
export const StreakBlock = ({ streakCount }: StreakBlockProps) => {
  const isRunning = streakCount > 0;

  return (
    <Panel tone={isRunning ? 'pink' : 'cream'} className="w-full items-center px-6 py-7">
      <Flame color={COLORS.black} size={36} strokeWidth={2.5} fill={isRunning ? COLORS.yellow : 'transparent'} />

      <Text className="font-head text-[88px] leading-[96px] text-black">{streakCount}</Text>

      <Text className="font-head text-xl uppercase text-black">
        {streakCount === 1 ? 'jour d’affilée' : 'jours d’affilée'}
      </Text>

      {isRunning
        ? null
        : (
          <Text className="mt-2 text-center font-sans text-base text-black/70">
            Réponds aujourd’hui pour repartir.
          </Text>
        )}
    </Panel>
  );
};
