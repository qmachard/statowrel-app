import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { QUESTION_STATFLOUZZ_COST } from '@statowrel/models';
import { ChevronLeft, MessageCircleQuestionMark, UserRoundPlus } from '@/components/icons';
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
import { Tabs, type TabItem } from '@/components/Tabs';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';
import type { MenuTab, RootStackParamList } from '@/navigation/types';
import { FriendsCard } from '@/friends/components/FriendsCard';
import { amountLabel, spokenAmountLabel } from '@/lib/statflouzz';
import { NotificationsButton } from '@/notifications/components/NotificationsButton';
import { clearPendingDemoAnswer } from '@/onboarding/data/demoAnswerStore';
import { resetOnboardingSeen } from '@/onboarding/data/useOnboardingSeen';
import { MyQuestionsCard } from '@/questions/components/MyQuestionsCard';

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
  // Takes the width the two buttons leave, which is what pushes the invitation
  // to the right edge without a spacer of its own.
  heading: {
    flex: 1,
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
  // The switch and the panel it drives are one block, tighter than the screen's
  // own rhythm: the two lists are read as what the tab above them selects.
  panel: {
    gap: spacing(3),
  },
  // A list and the action it leads to, on the panel's own rhythm — the same
  // block on either tab.
  list: {
    gap: spacing(3),
  },
  // The inactive list stays mounted and drops out of the layout instead of
  // unmounting: each card holds its own `onSnapshot`, and remounting on every
  // toggle would re-read the collection each time.
  hidden: {
    display: 'none',
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

const TABS: readonly TabItem<MenuTab>[] = [
  { value: 'friends', label: 'Mes potes' },
  { value: 'questions', label: 'Mes questions' },
];

export const MenuScreen = () => {
  const navigation = useNavigation();
  // The panel a notification asked for, if one did (docs/prd.md §4.7). « Mes
  // potes » otherwise: it is what somebody who opened the Menu themselves came
  // for, and the questions are the list one is *sent* to.
  const { params } = useRoute<RouteProp<RootStackParamList, 'Menu'>>();
  const { user, profile } = useAuth();
  const [ deleting, setDeleting ] = useState(false);
  // The selected panel carries the params it was chosen against, and the
  // current one is derived from the two — rather than a `setTab` in an effect,
  // which is an error here (see this app's CLAUDE.md). A fresh mount is not the
  // only way to arrive: a notification tapped while the Menu is already on
  // screen navigates to the same route with new params and remounts nothing, so
  // params the user has not chosen against are params that win.
  const [ selection, setSelection ] = useState<{ from: typeof params; tab: MenuTab }>(
    () => ({ from: params, tab: params?.tab ?? 'friends' }),
  );

  const tab = selection.from === params ? selection.tab : params?.tab ?? selection.tab;
  const setTab = (next: MenuTab) => setSelection({ from: params, tab: next });

  const openInvite = () => navigation.navigate('InviteFriend');

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
          {/* Top right of the screen rather than over the friend list: inviting
              is the one thing on this screen somebody arrives already meaning
              to do, so it is reachable whichever tab is up. */}
          <Button label="Inviter un pote" icon={UserRoundPlus} size="icon-sm" onPress={openInvite} />
        </View>

        <View style={styles.identity}>
          <Avatar
            size="2xl"
            name={profile?.username ?? user.email ?? '?'}
            uri={user.photoURL}
          />

          <Text style={styles.name} numberOfLines={1}>
            {profile ? `@${profile.username}` : 'Profil en cours de création…'}
          </Text>
          <Text style={styles.email}>{profile?.email ?? user.email ?? '—'}</Text>
        </View>

        {/* The two lists of docs/prd.md §5.3 sit behind a switch rather than one
            under the other: stacked, they made the screen an endless scroll that
            buried the settings under two lists that only grow. */}
        <View style={styles.panel}>
          <Tabs items={TABS} value={tab} onChange={setTab} />

          <View style={tab === 'friends' ? styles.list : styles.hidden}>
            <FriendsCard
              onOpenFriend={(friendId, friendUsername) => navigation.navigate('Friend', { friendId, friendUsername })}
            />

            {/* The list's own call to action, under what it is about — the
                header's icon button is the shortcut, this is the sentence.
                Full width, because at the bottom of a list there is nothing
                left to share the line with. */}
            <Button label="Inviter un pote" icon={UserRoundPlus} onPress={openInvite} />
          </View>

          {/* A drawn proposal opens its day the way a calendar cell does. */}
          <View style={tab === 'questions' ? styles.list : styles.hidden}>
            <MyQuestionsCard onOpenDay={(date) => navigation.navigate('DailyQuestion', { date })} />

            {/* The invitation's twin under the other list. It carries the price
                the Stats card carries, since a button that spends cannot stay
                quiet about it — but not that card's under-price treatment: the
                balance is shown there, beside what it pays for, and a price
                argued next to no balance argues with nothing. An empty wallet
                is refused by the callable, in its own sentence. */}
            <Button
              label="Poser une question"
              icon={MessageCircleQuestionMark}
              trailingLabel={amountLabel(QUESTION_STATFLOUZZ_COST)}
              accessibilityLabel={`Poser une question, ${spokenAmountLabel(QUESTION_STATFLOUZZ_COST)}`}
              onPress={() => navigation.navigate('ProposeQuestion')}
            />
          </View>
        </View>

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
