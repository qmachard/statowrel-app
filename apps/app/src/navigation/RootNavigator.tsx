import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '@/auth/AuthContext';
import { SignInScreen } from '@/auth/screens/SignInScreen';
import { SignUpScreen } from '@/auth/screens/SignUpScreen';
import { colors } from '@/design/tokens';

import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user } = useAuth();

  // Only the half of the stack the session can reach is registered: a signed-out
  // user has no route into the app, a signed-in one no route back to the sign-in
  // screens, and signing in or out swaps the whole stack instead of navigating.
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      {user ? (
        <Stack.Screen name="Tabs" component={TabNavigator} options={{ animation: 'none' }} />
      ) : (
        <>
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};
