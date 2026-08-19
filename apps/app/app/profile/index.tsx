import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';
import { DISPLAY_NAME_LIMIT, type DisplayNameValues, displayNameSchema } from '@/auth/schemas';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { type Friend, useFriends } from '@/hooks/useFriends';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function ProfileScreen() {
  const { user, initializing } = useAuth();
  const { profile, loading, updateDisplayName } = useUserProfile(user?.uid ?? null);
  const friends = useFriends(user?.uid ?? null);

  if (initializing) {
    return null;
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-8 p-6">
        {loading || !profile
          ? <ActivityIndicator className="mt-12" color="#000000" />
          : (
            <>
              <ProfileHeader
                displayName={profile.display_name}
                photoUrl={profile.photo_url ?? null}
                onSubmitDisplayName={updateDisplayName}
              />
              <FriendsSection
                friends={friends.friends}
                loading={friends.loading}
                onRemove={friends.removeFriend}
              />
            </>
          )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface ProfileHeaderProps {
  displayName: string;
  photoUrl: string | null;
  onSubmitDisplayName: (displayName: string) => Promise<void>;
}

const ProfileHeader = ({ displayName, photoUrl, onSubmitDisplayName }: ProfileHeaderProps) => {
  const [ isEditing, setIsEditing ] = useState(false);

  const { control, handleSubmit, reset, formState } = useForm<DisplayNameValues>({
    resolver: zodResolver(displayNameSchema),
    defaultValues: { display_name: displayName },
  });

  const startEditing = () => {
    reset({ display_name: displayName });
    setIsEditing(true);
  };

  const submit = handleSubmit(async ({ display_name }) => {
    try {
      await onSubmitDisplayName(display_name);
      setIsEditing(false);
    } catch {
      Alert.alert('Pseudo non enregistré', 'Réessaie dans un instant.');
    }
  });

  return (
    <View className="items-center gap-6 border-2 border-border bg-card p-6 shadow-lg">
      <Link href="/profile/avatar" asChild>
        <Pressable accessibilityRole="button" accessibilityLabel="Changer d’avatar">
          <Avatar fallback={displayName} photoUrl={photoUrl} size="lg" />
        </Pressable>
      </Link>

      {isEditing ? (
        <View className="w-full gap-4">
          <Controller
            control={control}
            name="display_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Pseudo"
                error={formState.errors.display_name?.message}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={DISPLAY_NAME_LIMIT}
                placeholder="Ton pseudo"
                returnKeyType="done"
                onSubmitEditing={submit}
              />
            )}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Enregistrer" loading={formState.isSubmitting} onPress={submit} />
            </View>
            <View className="flex-1">
              <Button label="Annuler" variant="outline" onPress={() => setIsEditing(false)} />
            </View>
          </View>
        </View>
      ) : (
        <View className="flex-row items-center gap-3">
          <Text className="font-head text-2xl uppercase text-card-foreground">{displayName}</Text>
          <Pressable
            className="border-2 border-border bg-primary px-3 py-1.5 shadow-xs"
            onPress={startEditing}
            accessibilityRole="button"
            accessibilityLabel="Modifier le pseudo"
          >
            <Text className="font-head text-xs uppercase text-primary-foreground">Modifier</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

interface FriendsSectionProps {
  friends: Friend[];
  loading: boolean;
  onRemove: (friendId: string) => Promise<void>;
}

const FriendsSection = ({ friends, loading, onRemove }: FriendsSectionProps) => {
  const invite = () => {
    // The invitation link and its 6-character code (docs/prd.md §4.1) land with
    // the invitation backend — until then, sharing carries the pitch only.
    Share.share({ message: 'Rejoins-moi sur StatOwrel, la question du jour entre potes.' });
  };

  const confirmRemove = (friend: Friend) => {
    Alert.alert('Retirer ce pote ?', `${friend.displayName} ne verra plus tes réponses.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await onRemove(friend.id);
          } catch {
            Alert.alert('Suppression impossible', 'Réessaie dans un instant.');
          }
        },
      },
    ]);
  };

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-head text-xl uppercase text-foreground">Amis</Text>
        <Pressable
          className="h-10 w-10 items-center justify-center border-2 border-border bg-primary shadow-sm"
          onPress={invite}
          accessibilityRole="button"
          accessibilityLabel="Inviter un pote"
        >
          <Text className="font-head text-xl text-primary-foreground">+</Text>
        </Pressable>
      </View>

      {loading ? <ActivityIndicator color="#000000" /> : null}

      {!loading && friends.length === 0 ? (
        <View className="border-2 border-border bg-muted p-6">
          <Text className="text-center font-sans text-base text-muted-foreground">
            Sans potes, StatOwrel c’est juste des chiffres.
          </Text>
        </View>
      ) : null}

      {friends.map((friend) => (
        <View
          key={friend.id}
          className="flex-row items-center gap-3 border-2 border-border bg-card p-3 shadow-sm"
        >
          <Avatar fallback={friend.displayName} photoUrl={friend.photoUrl} size="sm" shadow={false} />
          <Text className="flex-1 font-head text-base uppercase text-card-foreground" numberOfLines={1}>
            {friend.displayName}
          </Text>
          <Pressable
            className="border-2 border-border bg-destructive px-3 py-1.5"
            onPress={() => confirmRemove(friend)}
            accessibilityRole="button"
            accessibilityLabel={`Supprimer ${friend.displayName}`}
          >
            <Text className="font-head text-xs uppercase text-destructive-foreground">Supprimer</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
};
