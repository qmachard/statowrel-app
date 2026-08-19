import { Text, View } from 'react-native';

import { StickerButton } from '@/components/StickerButton';
import { PencilShape, PlusShape } from '@/components/icons/shapes';
import colors from '@/theme/colors';

interface StatsHeaderProps {
  displayName: string;
  onEditProfile?: () => void;
  onInviteFriend?: () => void;
}

/**
 * Greeting on the left, the two account actions on the right (docs/prd.md §5.1).
 *
 * With no tabbar, these are the only way out of the Stats screen: everything
 * the Profil screen owns is reached from them.
 */
export function StatsHeader({ displayName, onEditProfile, onInviteFriend }: StatsHeaderProps) {
  return (
    <View className="flex-row items-start justify-between">
      <View className="shrink">
        <Text className="font-head text-3xl text-foreground">Salut {displayName}</Text>
        <Text className="font-sans text-base text-muted-foreground">Voilà où tu en es.</Text>
      </View>

      <View className="flex-row gap-2">
        <StickerButton
          shape={PlusShape}
          label="Inviter un pote"
          fill={colors.pop}
          onPress={onInviteFriend}
        />
        <StickerButton
          shape={PencilShape}
          label="Modifier le profil"
          fill={colors.primary}
          onPress={onEditProfile}
        />
      </View>
    </View>
  );
}
