import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '@/auth/AuthContext';
import { SignInScreen } from '@/auth/screens/SignInScreen';
import { SignUpScreen } from '@/auth/screens/SignUpScreen';
import { HomeScreen } from '@/screens/HomeScreen';

import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user, initializing } = useAuth();

  // The splash screen is still up until the persisted session resolves (see
  // `SplashGate`), so mounting no navigator here never shows through — and the
  // signed-in / signed-out screens below swap declaratively, which is what keeps
  // the app from ever navigating before the navigator is mounted.
  if (initializing) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Home" component={HomeScreen} />
      ) : (
        <>
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};
