import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  SignIn: undefined;
  SignUp: undefined;
};

export type RootStackNavigation = NativeStackNavigationProp<RootStackParamList>;

declare global {
  namespace ReactNavigation {
    // Makes `useNavigation()` and `navigationRef` resolve the root routes without
    // a type argument. It is a declaration merge, so the empty body is the point.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
