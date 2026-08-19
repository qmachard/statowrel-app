import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AVATAR_URLS } from '@/lib/avatars';

const NUM_COLUMNS = 4;

type AvatarTile =
  /** "No picture, keep my initials" — opens the grid, sets `photo_url` back to null. */
  | { type: 'initials' }
  | { type: 'avatar'; url: string }
  /** Fills the last row so its tiles keep the grid's square size instead of stretching. */
  | { type: 'spacer' };

const TILES: AvatarTile[] = (() => {
  const tiles: AvatarTile[] = [
    { type: 'initials' },
    ...AVATAR_URLS.map((url): AvatarTile => ({ type: 'avatar', url })),
  ];

  const remainder = tiles.length % NUM_COLUMNS;
  if (remainder > 0) {
    for (let i = 0; i < NUM_COLUMNS - remainder; i++) {
      tiles.push({ type: 'spacer' });
    }
  }

  return tiles;
})();

export default function AvatarPickerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, loading, updatePhotoUrl } = useUserProfile(user?.uid ?? null);

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  const select = async (photoUrl: string | null) => {
    await updatePhotoUrl(photoUrl);
    router.back();
  };

  return (
    <View className="flex-1 bg-background">
      {loading ? (
        <ActivityIndicator className="mt-12" color="#000000" />
      ) : (
        <FlatList
          data={TILES}
          numColumns={NUM_COLUMNS}
          keyExtractor={(_, index) => String(index)}
          contentContainerClassName="p-3"
          ListHeaderComponent={
            <Text className="px-1 pb-3 font-head text-2xl text-foreground">Choisis ta tête</Text>
          }
          renderItem={({ item }) => {
            if (item.type === 'spacer') {
              return <View className="m-1.5 aspect-square flex-1" />;
            }

            const url = item.type === 'avatar' ? item.url : null;
            const selected = (profile?.photo_url ?? null) === url;

            return (
              <Pressable
                className={`m-1.5 aspect-square flex-1 items-center justify-center border-2 bg-card ${selected ? 'border-border shadow-md' : 'border-muted'}`}
                onPress={() => select(url)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={url ? 'Avatar illustré' : 'Mes initiales'}
              >
                {url ? (
                  <Image source={{ uri: url }} className="h-full w-full" />
                ) : (
                  <Avatar fallback={profile?.display_name ?? '?'} size="md" shadow={false} />
                )}
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
