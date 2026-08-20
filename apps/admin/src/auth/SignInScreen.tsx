import { zodResolver } from '@hookform/resolvers/zod';
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { auth } from '@/lib/firebase';

import { authErrorMessage, isCancelledSignIn } from './errors';
import { type SignInValues, signInSchema } from './schemas';

/**
 * Sign-in only — e-mail + mot de passe and Google, the two doors `apps/app`
 * offers minus Apple, whose web flow needs a Services ID the mobile build does
 * not. There is no sign-up: accounts pre-exist and are granted the `admin`
 * claim by hand, and the gate on that claim lives in `AuthContext`.
 */
export const SignInScreen = () => {
  const [ error, setError ] = useState<string | null>(null);
  const [ googlePending, setGooglePending ] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (cause) {
      setError(authErrorMessage(cause, 'password'));
    }
  });

  const onGoogle = async () => {
    setError(null);
    setGooglePending(true);

    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (cause) {
      // Closing the popup is a choice, not a failure.
      if (!isCancelledSignIn(cause)) {
        setError(authErrorMessage(cause, 'google'));
      }
    } finally {
      setGooglePending(false);
    }
  };

  const busy = isSubmitting || googlePending;

  return (
    <main className="page page--centered">
      <div className="card stack">
        <h1>StatOwrel</h1>
        <p className="tagline">
          La modération des questions. Écris-en une, valide celles qui tiennent, elles peuvent tomber
          à 7h pour tout le monde.
        </p>

        <h2>Connexion</h2>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <form className="stack" onSubmit={onSubmit} noValidate>
          <TextField
            label="Adresse e-mail"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" block disabled={busy}>
            {isSubmitting ? 'Un instant…' : 'Se connecter'}
          </Button>
        </form>

        <Button variant="secondary" block onClick={onGoogle} disabled={busy}>
          {googlePending ? 'Un instant…' : 'Continuer avec Google'}
        </Button>

        <p className="tagline">
          Pas d'inscription ici : les comptes sont créés en amont et ouverts à la main.
        </p>
      </div>
    </main>
  );
};
