import { Authenticator } from 'firecms';
import { User as FirebaseUser } from 'firebase/auth';

const adminAuthenticator: Authenticator<FirebaseUser> = async ({ user, authController }) => {
  if (!user?.email) {
    throw Error('You are not allowed to access this app');
  }

  // TODO: restrict to actual admin emails once the team is defined, e.g.:
  // if (![ 'admin@statowrel.com' ].includes(user.email)) throw Error(...)

  authController.setExtra([ 'admin' ]);

  return true;
};

export default adminAuthenticator;
