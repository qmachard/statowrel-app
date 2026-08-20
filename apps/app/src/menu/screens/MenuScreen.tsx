import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';
import { signOut } from '@/auth/providers';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';
import { FriendsCard } from '@/friends/components/FriendsCard';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    gap: spacing(8),
    padding: spacing(6),
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  heading: {
    fontFamily: fonts.head,
    fontSize: fontSize.xl,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  // The account leads the screen, on the page itself: no card, no border — the
  // avatar is the surface, and it carries its own.
  identity: {
    alignItems: 'center',
    gap: spacing(3),
  },
  name: {
    fontFamily: fonts.head,
    fontSize: fontSize['2xl'],
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  email: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors['muted-foreground'],
  },
});

export const MenuScreen = () => {
  const navigation = useNavigation();
  const { user, profile } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[ 'top' ]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* The stack has no header (and no tab bar since docs/prd.md §5.1), so the
            way back to Stats has to live in the screen. */}
        <View style={styles.head}>
          <Button label="Retour" variant="outline" size="icon-sm" icon={ChevronLeft} onPress={() => navigation.goBack()} />
          <Text style={styles.heading}>Menu</Text>
        </View>

        <View style={styles.identity}>
          <Avatar
            size="xl"
            name={profile?.username ?? user.email ?? '?'}
            uri={profile?.photo_url ?? user.photoURL}
          />

          <Text style={styles.name} numberOfLines={1}>
            {profile ? `@${profile.username}` : 'Profil en cours de création…'}
          </Text>
          <Text style={styles.email}>{profile?.email ?? user.email ?? '—'}</Text>
        </View>

        <FriendsCard onInvite={() => navigation.navigate('InviteFriend')} />

        <Button label="Se déconnecter" variant="secondary" onPress={() => signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
};
