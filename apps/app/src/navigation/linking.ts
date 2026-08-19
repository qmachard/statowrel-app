import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [ Linking.createURL('/'), 'statowrel://' ],
  config: {
    screens: {
      Home: '',
      SignIn: 'sign-in',
      SignUp: 'sign-up',
    },
  },
};
