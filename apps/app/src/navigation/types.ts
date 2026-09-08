export type RootStackParamList = {
  Stats: undefined;
  /** One day's question — omit `date` for today's (docs/prd.md §5.4). */
  DailyQuestion: { date?: string } | undefined;
  /**
   * One friend seen from the outside — their streak and the compatibility
   * with them (docs/prd.md §5.3).
   *
   * The handle travels with the UID rather than being read on arrival: it is
   * already on the friendship entry the list was tapped from, and it is what
   * gives the screen its title and its face before anything is fetched.
   */
  Friend: { friendId: string; friendUsername: string };
  /**
   * Invite a friend by their exact handle (docs/prd.md §4.1).
   *
   * `username` pre-fills the field — what a `https://statowrel-app.web.app/i/lou`
   * link carries when the app is already installed (docs/prd.md §4.9). An
   * account that already exists cannot be attributed, so what the link offers it
   * is the friend request rather than the attribution.
   */
  InviteFriend: { username?: string } | undefined;
  /** Settings, friends, profile — everything that isn't the stats (docs/prd.md §5.1). */
  Menu: undefined;
  /** Write a question and pay for it in StatFlouzz (docs/prd.md §4.7). */
  ProposeQuestion: undefined;
  SignIn: undefined;
  SignUp: undefined;
  /** Ask Firebase for a password reset link (docs/prd.md §4.1). */
  ForgotPassword: undefined;
};

// Registering the root param list globally is what makes `useNavigation()` and
// `navigationRef` type-checked without passing the generic at every call site.
declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
