import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from '@/components/icons';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteAccount } from '@/auth/account';
import { useAuth } from '@/auth/AuthContext';
import { deleteAccountErrorMessage } from '@/auth/errors';
import { signOut } from '@/auth/providers';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { LegalLinks } from '@/components/LegalLinks';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';
import { FriendsCard } from '@/friends/components/FriendsCard';
import { NotificationsButton } from '@/notifications/components/NotificationsButton';
import { clearPendingDemoAnswer } from '@/onboarding/data/demoAnswerStore';
import { resetOnboardingSeen } from '@/onboarding/data/useOnboardingSeen';
import { MyQuestionsCard } from '@/questions/components/MyQuestionsCard';
import { ReferralsCard } from '@/referrals/components/ReferralsCard';

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
  // Signing out, deleting the account and the legal footer are one block at the
  // bottom of the screen, tighter than the screen's own rhythm: the three lines
  // belong together, and the gap above them is what separates them from the
  // friends.
  settings: {
    marginTop: 'auto',
    gap: spacing(3),
  },
});

export const MenuScreen = () => {
  const navigation = useNavigation();
  const { user, profile } = useAuth();
  const [ deleting, setDeleting ] = useState(false);

  const runDeletion = async () => {
    setDeleting(true);

    try {
      await deleteAccount();
      // Nothing to reset on the way out: the session is gone, so the navigator
      // has already swapped this screen for the signed-out half of the stack.
    } catch (error) {
      setDeleting(false);
      Alert.alert('Suppression impossible', deleteAccountErrorMessage(error));
    }
  };

  /**
   * A deletion is final and nothing brings it back, so it is asked twice — the
   * native alert rather than a sheet of our own: it is the dialog both systems
   * have taught their users to read before answering, and its destructive
   * button is the one they already know to hesitate on.
   */
  const confirmDeletion = () => {
    Alert.alert(
      'Supprimer ton compte ?',
      'Ton profil, ton pseudo, tes potes et ta série disparaissent définitivement. Tes réponses passées restent dans les compteurs, sans plus rien qui les relie à toi.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => void runDeletion() },
      ],
    );
  };

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
            uri={user.photoURL}
          />

          <Text style={styles.name} numberOfLines={1}>
            {profile ? `@${profile.username}` : 'Profil en cours de création…'}
          </Text>
          <Text style={styles.email}>{profile?.email ?? user.email ?? '—'}</Text>
        </View>

        <FriendsCard onInvite={() => navigation.navigate('InviteFriend')} />

        {/* Under the friends and above the settings: the two lists of docs/prd.md
            §5.3, in the order that section states them. A drawn proposal opens
            its day the way a calendar cell does. */}
        <MyQuestionsCard onOpenDay={(date) => navigation.navigate('DailyQuestion', { date })} />

        <ReferralsCard />

        <View style={styles.settings}>
          {/* Development only, and dropped from a release build by the `__DEV__`
              branch: the carousel is shown once per install and there is no
              product reason to replay it, but testing it otherwise means
              clearing the app's storage between every run. The demo pick goes
              with it, so the next run starts from nothing — and since the
              carousel only shows to a signed-out session, this also signs out. */}
          {__DEV__ ? (
            <Button
              label="Revoir l’intro (dev)"
              variant="ghost"
              onPress={() => {
                void Promise.all([ resetOnboardingSeen(), clearPendingDemoAnswer() ])
                  .then(() => signOut());
              }}
            />
          ) : null}
          {/* Above the way out, because it is the one line of this block that
              turns something on: whoever installed the app before the
              onboarding carousel's notification slide existed — or tapped
              « Passer » through it — has never been asked, and this is the only
              place in the app that asks again. */}
          <NotificationsButton />
          <Button label="Se déconnecter" variant="secondary" disabled={deleting} onPress={() => signOut()} />
          <Button
            label="Supprimer mon compte"
            variant="ghost"
            loading={deleting}
            onPress={confirmDeletion}
          />
          <LegalLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
