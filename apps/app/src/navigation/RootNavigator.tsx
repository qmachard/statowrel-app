import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '@/auth/AuthContext';
import { SignInScreen } from '@/auth/screens/SignInScreen';
import { SignUpScreen } from '@/auth/screens/SignUpScreen';
import { DailyQuestionScreen } from '@/daily-question/screens/DailyQuestionScreen';
import { colors } from '@/design/tokens';
import { InviteFriendScreen } from '@/friends/screens/InviteFriendScreen';
import { MenuScreen } from '@/menu/screens/MenuScreen';
import { StatsScreen } from '@/stats/screens/StatsScreen';

import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user } = useAuth();

  // Only the half of the stack the session can reach is registered: a signed-out
  // user has no route into the app, a signed-in one no route back to the sign-in
  // screens, and signing in or out swaps the whole stack instead of navigating.
  //
  // An account that hasn't chosen its username yet lands here all the same —
  // the onboarding sheet (`src/auth/OnboardingSheet.tsx`) is rendered beside
  // this navigator and covers the app until it has.
  //
  // There is no tab bar (docs/prd.md §5.1): Stats is the root, and the menu —
  // profile today, settings and friends later — opens from the header button
  // on top of it.
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      {user ? (
        <>
          <Stack.Screen name="Stats" component={StatsScreen} options={{ animation: 'none' }} />
          {/* The question is posed *over* Stats, never beside it (docs/prd.md §5.4):
              a full modal — a page sheet on iOS, full screen on Android — whose
              content scrolls inside it (the screen owns the scroll view). Not a
              `formSheet`: the friends' list scrolling inside one dragged the
              sheet itself on Android, closing it mid-scroll.

              Still dismissable — swipe down on iOS, the back gesture on
              Android, the close button on both. Pinning it open while today's
              question is unanswered, as §5.4 wants, comes with answering (§4.3). */}
          <Stack.Screen
            name="DailyQuestion"
            component={DailyQuestionScreen}
            options={{
              presentation: 'modal',
              // The surface is set by the screen itself, which is the only
              // place that knows whether the day has been answered — see
              // `DailyQuestionScreen`.
            }}
          />
          {/* Inviting a friend is the same kind of sheet as the question: a
              short form posed over Stats, sized by its own content, and
              dismissable — nothing is blocked on it (docs/prd.md §4.1, §5.1). */}
          <Stack.Screen
            name="InviteFriend"
            component={InviteFriendScreen}
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: 'fitToContents',
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen name="Menu" component={MenuScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};
