import { z } from 'zod';

/** Firebase Auth's own floor. */
const PASSWORD_MIN_LENGTH = 6;
const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 24;

const email = z
  .string()
  .trim()
  .min(1, 'Renseigne ton adresse e-mail.')
  .email('Cette adresse e-mail n\'est pas valide.');

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Ton mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères.`);

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Renseigne ton mot de passe.'),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(DISPLAY_NAME_MIN_LENGTH, `Ton pseudo doit faire au moins ${DISPLAY_NAME_MIN_LENGTH} caractères.`)
    .max(DISPLAY_NAME_MAX_LENGTH, `Ton pseudo doit faire au plus ${DISPLAY_NAME_MAX_LENGTH} caractères.`),
  email,
  password,
});

export type SignUpValues = z.infer<typeof signUpSchema>;
