import { UserPen, UserRoundPlus } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { formatDayLabel } from '@/lib/dates';

export interface StatsHeaderProps {
  displayName: string;
  /** Invite a friend — docs/prd.md §4.1. Inert until the invite flow exists. */
  onInvite?: () => void;
  /** Edit the profile — docs/prd.md §5.3. */
  onEditProfile?: () => void;
}

/** Greeting on the left, the app's only two actions on the right (docs/prd.md §5.1). */
export const StatsHeader = ({ displayName, onInvite, onEditProfile }: StatsHeaderProps) => (
  <View className="flex-row items-center justify-between gap-4">
    <View className="shrink gap-1.5">
      <Text className="font-sans text-xs uppercase text-muted-foreground">{formatDayLabel(new Date())}</Text>
      <Text className="font-head text-2xl uppercase text-foreground" numberOfLines={1}>
        Salut {displayName}
      </Text>
    </View>

    <View className="flex-row gap-3">
      <Button label="Inviter un pote" icon={UserRoundPlus} size="icon" onPress={onInvite} />
      <Button label="Modifier le profil" icon={UserPen} variant="outline" size="icon" onPress={onEditProfile} />
    </View>
  </View>
);
