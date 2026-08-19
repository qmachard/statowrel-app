import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '@/auth/AuthContext';
import { ProfileScreen } from '@/auth/screens/ProfileScreen';
import { SignInScreen } from '@/auth/screens/SignInScreen';
import { SignUpScreen } from '@/auth/screens/SignUpScreen';
import { DailyQuestionScreen } from '@/daily-question/screens/DailyQuestionScreen';
import { colors } from '@/design/tokens';
import { StatsScreen } from '@/stats/screens/StatsScreen';

import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user } = useAuth();

  // Only the half of the stack the session can reach is registered: a signed-out
  // user has no route into the app, a signed-in one no route back to the sign-in
  // screens, and signing in or out swaps the whole stack instead of navigating.
  //
  // There is no tab bar (docs/prd.md §5.1): Stats is the root, and the profile
  // opens from the header button on top of it.
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      {user ? (
        <>
          <Stack.Screen name="Stats" component={StatsScreen} options={{ animation: 'none' }} />
          {/* The question is posed *over* Stats, never beside it (docs/prd.md §5.4):
              a form sheet whose single detent is its own content, so a two-line
              question takes a short sheet and a six-option one a tall one, with
              Stats still visible above it. The screen renders no scroll view for
              that reason — `fitToContents` measures the content, and a nested
              scroller has no height to measure.

              Still dismissable, grabber included. Pinning it open while today's
              question is unanswered, as §5.4 wants, comes with answering (§4.3). */}
          <Stack.Screen
            name="DailyQuestion"
            component={DailyQuestionScreen}
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: 'fitToContents',
              sheetGrabberVisible: true,
              // Accent red, the same surface as today's calendar cell — the
              // sheet is what that cell opens. Overridden here rather than in
              // the screen so nothing of the stack's cream shows through around
              // the content.
              contentStyle: { backgroundColor: colors.accent },
            }}
          />
          <Stack.Screen name="Profile" component={ProfileScreen} />
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
