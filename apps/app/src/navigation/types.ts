/** The two panels of the Menu's switch (docs/prd.md §5.3), named as a route can carry them. */
export type MenuTab = 'friends' | 'questions';

export type RootStackParamList = {
  Stats: undefined;
  /**
   * One day's question — omit `date` for today's (docs/prd.md §5.4).
   *
   * `intent: 'joker'` comes from the 21:00 streak reminder alone (§4.6) and
   * asks the screen to open the joker confirmation on arrival, so that
   * saving a série from a notification is two taps rather than a hunt. The
   * screen still decides whether it makes sense by then — the day may have
   * been answered on another device in the meantime.
   */
  DailyQuestion: { date?: string; intent?: 'joker' } | undefined;
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
  /**
   * Settings, friends, profile — everything that isn't the stats (docs/prd.md §5.1).
   *
   * `tab` picks which of the two panels the switch opens on. It is a route
   * param and not screen state alone because a notification has to be able to
   * land on either: a moderation verdict is read on the row of the question it
   * is about (§4.7), and dropping the reader on « Mes potes » would leave them
   * to find the switch themselves.
   */
  Menu: { tab?: MenuTab } | undefined;
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
