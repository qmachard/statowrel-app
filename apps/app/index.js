// [DEBUG] Temporary package-level bisection of the launch cost: each heavy
// package is required explicitly and timed. `require` is cached, so the first
// require pays the package's whole evaluation cost and the timeline below
// names it; the ES imports further down then cost nothing. Remove with the fix.
const { mark } = require('./src/lib/startupTrace');

mark('requires start');
require('react-native');
mark('react-native');
require('expo');
mark('expo');
require('react-native-gesture-handler');
mark('react-native-gesture-handler');
require('react-native-reanimated');
mark('react-native-reanimated');
require('@react-navigation/native');
mark('@react-navigation/native');
require('@react-navigation/native-stack');
mark('@react-navigation/native-stack');
require('react-native-svg');
mark('react-native-svg');
require('lottie-react-native');
mark('lottie-react-native');
require('expo-notifications');
mark('expo-notifications');
require('@react-native-firebase/app');
require('@react-native-firebase/auth');
require('@react-native-firebase/firestore');
require('@react-native-firebase/functions');
mark('@react-native-firebase/*');
require('@react-native-google-signin/google-signin');
mark('@react-native-google-signin/google-signin');
require('expo-apple-authentication');
mark('expo-apple-authentication');
require('zod');
mark('zod');
require('react-hook-form');
mark('react-hook-form');
require('@expo-google-fonts/archivo-black');
require('@expo-google-fonts/space-grotesk');
mark('@expo-google-fonts/*');
require('lucide-react-native/icons/x');
mark('lucide icons (deep)');

const { registerRootComponent } = require('expo');
const App = require('./src/App').default;

mark('src/App required (whole app graph)');

registerRootComponent(App);
