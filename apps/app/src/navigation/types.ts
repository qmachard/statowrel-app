export type RootStackParamList = {
  Stats: undefined;
  /** One day's question — omit `date` for today's (docs/prd.md §5.4). */
  DailyQuestion: { date?: string } | undefined;
  Profile: undefined;
  SignIn: undefined;
  SignUp: undefined;
};

// Registering the root param list globally is what makes `useNavigation()` and
// `navigationRef` type-checked without passing the generic at every call site.
declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
