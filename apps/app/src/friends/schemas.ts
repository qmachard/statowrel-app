import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_PATTERN } from '@statowrel/models';
import { z } from 'zod';

/**
 * The handle of the friend being invited (docs/prd.md §4.1).
 *
 * Same shape as the one claimed on the onboarding sheet — it is the same
 * handle, seen from the other side — but not the same messages: here the user
 * is typing *somebody else's* name, so a malformed one is « ce n'est pas un nom
 * d'utilisateur » rather than « ton nom d'utilisateur est trop court ».
 *
 * Lowercased rather than rejected on case, for the same reason as everywhere
 * else: a handle exists in one single form.
 */
export const inviteFriendSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Tape le nom d\'utilisateur de ton pote.')
    .min(USERNAME_MIN_LENGTH, 'Ce nom d\'utilisateur est trop court.')
    .max(USERNAME_MAX_LENGTH, 'Ce nom d\'utilisateur est trop long.')
    .regex(USERNAME_PATTERN, 'Ce nom d\'utilisateur n\'est pas valide.'),
});

export type InviteFriendValues = z.infer<typeof inviteFriendSchema>;
