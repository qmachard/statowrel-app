import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';

import { useAuth } from './AuthContext';

/** Signed in, but without the `admin` claim — the one thing this interface asks for. */
export const AccessDeniedScreen = () => {
  const { user, signOut } = useAuth();

  return (
    <main className="page page--centered">
      <div className="card stack">
        <h1>Accès refusé</h1>
        <Alert tone="error">Ce compte n'a pas accès à la modération des questions.</Alert>
        <p className="tagline">
          {user?.email ? `Connecté en tant que ${user.email}. ` : ''}
          L'accès s'ouvre compte par compte : demande-le, puis reconnecte-toi.
        </p>
        <Button variant="secondary" block onClick={() => { void signOut(); }}>
          Me déconnecter
        </Button>
      </div>
    </main>
  );
};
