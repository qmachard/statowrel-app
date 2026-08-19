import { Authenticator } from 'firecms';
import { User as FirebaseUser } from 'firebase/auth';

const adminAuthenticator: Authenticator<FirebaseUser> = async ({ user, authController }) => {
  if (!user) {
    throw Error('You are not allowed to access this app');
  }

  // Force a token refresh so a claim granted after the last sign-in is picked up.
  const { claims } = await user.getIdTokenResult(true);

  if (claims.admin !== true) {
    throw Error('You are not allowed to access this app');
  }

  authController.setExtra([ 'admin' ]);

  return true;
};

export default adminAuthenticator;
