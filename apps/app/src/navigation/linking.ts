import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [ Linking.createURL('/'), 'statowrel://' ],
  config: {
    screens: {
      SignIn: 'sign-in',
      SignUp: 'sign-up',
      Stats: '',
      DailyQuestion: 'question/:date?',
      InviteFriend: 'invite',
      Menu: 'menu',
    },
  },
};
