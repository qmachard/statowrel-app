import { zodResolver } from '@hookform/resolvers/zod';
import { FirebaseError } from 'firebase/app';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { auth } from '@/lib/firebase';

import { authErrorMessage } from './errors';
import { type ResetPasswordValues, resetPasswordSchema } from './schemas';

/**
 * An address nobody holds is swallowed rather than reported: the screen says
 * the same thing whether or not the account exists, so the form cannot be used
 * to tell which e-mails open the console. Firebase's own e-mail enumeration
 * protection already answers that way — this covers the projects where it is
 * turned off.
 */
const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (cause) {
    if (!(cause instanceof FirebaseError) || cause.code !== 'auth/user-not-found') {
      throw cause;
    }
  }
};

/**
 * The « Mot de passe oublié ? » door of the sign-in screen, the same one
 * `apps/app` offers: an address is typed, Firebase mails the reset link, and
 * the new password is chosen on the page it opens — the console never handles
 * it, and has no account of its own to create anyway.
 *
 * Once the mail has gone out the form is replaced by what happened: the screen
 * had one thing to do, and a form left standing invites a second send that says
 * exactly the same thing.
 */
export const ForgotPasswordScreen = ({ onBack }: { onBack: () => void }) => {
  const [ error, setError ] = useState<string | null>(null);
  const [ sentTo, setSentTo ] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);

    try {
      await sendPasswordReset(email);
      setSentTo(email);
    } catch (cause) {
      setError(authErrorMessage(cause));
    }
  });

  return (
    <main className="page page--centered">
      <div className="card stack">
        <h1>StatOwrel</h1>

        <h2>Mot de passe oublié</h2>

        {sentTo === null ? (
          <>
            <p className="tagline">
              Donne ton adresse e-mail : on t'envoie un lien pour en choisir un nouveau.
            </p>

            {error ? <Alert tone="error">{error}</Alert> : null}

            <form className="stack" onSubmit={onSubmit} noValidate>
              <TextField
                label="Adresse e-mail"
                type="email"
                autoComplete="email"
                autoFocus
                error={errors.email?.message}
                {...register('email')}
              />
              <Button type="submit" block disabled={isSubmitting}>
                {isSubmitting ? 'Un instant…' : 'Envoyer le lien'}
              </Button>
            </form>
          </>
        ) : (
          <Alert tone="success">
            {`Si un compte utilise ${sentTo}, un lien de réinitialisation vient d'y être envoyé. Pense à regarder dans tes spams.`}
          </Alert>
        )}

        <Button variant="ghost" block onClick={onBack}>
          Retour à la connexion
        </Button>
      </div>
    </main>
  );
};
