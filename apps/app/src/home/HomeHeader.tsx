import { UserPlus, UserRoundPen } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { IconButton } from '@/components/IconButton';

export interface HomeHeaderProps {
  displayName: string;
  onInvite: () => void;
  onEditProfile: () => void;
}

export const HomeHeader = ({ displayName, onInvite, onEditProfile }: HomeHeaderProps) => (
  <View className="flex-row items-center justify-between gap-4">
    <View className="shrink">
      <Text className="font-sans text-sm uppercase text-black/60">Salut</Text>
      <Text className="font-head text-3xl uppercase text-black" numberOfLines={1}>{displayName}</Text>
    </View>

    <View className="flex-row gap-3">
      {/* Pink marks what is not an ordinary day — inviting a friend is the one
          action on this screen that reaches outside the app (docs/prd.md §4.1). */}
      <IconButton icon={UserPlus} tone="pink" accessibilityLabel="Inviter un pote" onPress={onInvite} />
      <IconButton icon={UserRoundPen} accessibilityLabel="Modifier le profil" onPress={onEditProfile} />
    </View>
  </View>
);
