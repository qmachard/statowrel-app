import { z } from 'zod';

import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_PATTERN } from '@statowrel/models';

/** Firebase Auth's own floor. */
const PASSWORD_MIN_LENGTH = 6;

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
  email,
  password,
});

export type SignUpValues = z.infer<typeof signUpSchema>;

export const resetPasswordSchema = z.object({ email });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/**
 * The username is asked for once, on its own sheet, after the first sign-in.
 *
 * Lowercased rather than rejected on case: a handle is compared, stored and
 * looked up in one single form (`normalizeUsername`), so `Lou` and `lou` are
 * the same person's claim on the same name, not two different ones.
 */
export const onboardingSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(USERNAME_MIN_LENGTH, `Ton nom d'utilisateur doit faire au moins ${USERNAME_MIN_LENGTH} caractères.`)
    .max(USERNAME_MAX_LENGTH, `Ton nom d'utilisateur doit faire au plus ${USERNAME_MAX_LENGTH} caractères.`)
    .regex(USERNAME_PATTERN, 'Lettres, chiffres, point et tiret bas seulement, et il doit commencer et finir par une lettre ou un chiffre.'),
});

export type OnboardingValues = z.infer<typeof onboardingSchema>;
