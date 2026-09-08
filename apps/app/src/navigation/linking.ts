import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

import { SITE_ORIGIN } from '@/lib/site';

import type { RootStackParamList } from './types';

/**
 * `SITE_ORIGIN` is a prefix here as well as a custom scheme, and that is the
 * referral link of docs/prd.md §4.9 — `https://statowrel-app.web.app/i/lou`
 * opening the app rather than the browser.
 *
 * Only `/i/*` ever arrives: iOS is scoped by the `components` block of the
 * association file and Android by the intent filter's `pathPrefix`, both of
 * which deliberately leave `/legal/*` to the browser — those pages are what the
 * store listings point at, and an app that swallowed them would answer a
 * reviewer's tap with nothing.
 *
 * A link tapped with **no session** matches nothing here: `RootNavigator` only
 * registers the half of the stack a signed-out user can reach. That is not a
 * gap — the handle is kept by `useReferrerCapture` and offered on the username
 * sheet, which is the only moment `referred_by` can be written.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [ Linking.createURL('/'), 'statowrel://', SITE_ORIGIN ],
  config: {
    screens: {
      SignIn: 'sign-in',
      SignUp: 'sign-up',
      ForgotPassword: 'forgot-password',
      Stats: '',
      DailyQuestion: 'question/:date?',
      // The same path the web serves, so one URL shape covers both — see
      // `src/referrals/links.ts`.
      InviteFriend: 'i/:username?',
      Menu: 'menu',
    },
  },
};
