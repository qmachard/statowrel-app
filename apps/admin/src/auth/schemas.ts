import { z } from 'zod';

/**
 * Sign-in only: there is no sign-up here. Accounts are created elsewhere and
 * granted the `admin` claim by hand (`npm run set-admin`), so this interface
 * never has a password policy of its own to enforce.
 */
export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Renseigne ton adresse e-mail.')
    .email('Cette adresse e-mail n\'est pas valide.'),
  password: z.string().min(1, 'Renseigne ton mot de passe.'),
});

export type SignInValues = z.infer<typeof signInSchema>;
