import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CircleUser, Flame } from 'lucide-react-native';

import { ProfileScreen } from '@/auth/screens/ProfileScreen';
import { colors, ink, withAlpha } from '@/design/tokens';
import { HomeScreen } from '@/home/screens/HomeScreen';

import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: colors.background },
      tabBarActiveTintColor: colors.foreground,
      tabBarInactiveTintColor: withAlpha(ink.black, 0.4),
      tabBarLabelStyle: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, textTransform: 'uppercase' },
      // Thick top border, no elevation — the neobrutalism tab bar.
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 2 },
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        title: 'Du jour',
        tabBarIcon: ({ color }) => <Flame size={24} color={color} />,
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        title: 'Profil',
        tabBarIcon: ({ color }) => <CircleUser size={24} color={color} />,
      }}
    />
  </Tab.Navigator>
);
