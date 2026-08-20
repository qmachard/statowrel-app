import { buildCollection, buildProperty } from 'firecms';

import { FRIENDSHIP_STATUSES, USER_FRIEND_COLLECTION, UserFriendData } from '@statowrel/models';

/**
 * FireCMS reads Firestore documents through its own data source, which maps
 * Firestore `Timestamp`s to `Date` — not through `userFriendConverter` (that
 * one is for `apps/app` and `apps/functions`, where timestamps become ISO
 * strings).
 */
type UserFriendEntity = Omit<UserFriendData, 'created_at' | 'accepted_at'> & {
  created_at: Date;
  accepted_at: Date | null;
};

/**
 * Sub-collection of `v1_users`, wired into it via `subcollections`.
 *
 * Read-only, and here for diagnosis only: a friendship is two documents, one
 * under each user, and the backoffice only ever shows one side at a time.
 * Editing or deleting from here would leave the other half behind — a
 * friendship accepted on one side and pending on the other, or a friend who
 * still has you in their list once you no longer have them.
 */
const userFriendsCollection = buildCollection<UserFriendEntity>({
  path: USER_FRIEND_COLLECTION,
  name: 'Amis',
  singularName: 'Ami',
  icon: 'People',
  description: 'Une entrée par ami, l\'identifiant du document étant l\'UID de l\'ami. L\'amitié est réciproque : chaque relation existe aussi dans la liste d\'en face.',
  permissions: {
    create: false,
    edit: false,
    delete: false,
  },
  properties: {
    friend_id: buildProperty({
      dataType: 'string',
      name: 'Ami',
      description: 'UID Firebase Auth de l\'ami. Sert aussi d\'identifiant au document.',
      readOnly: true,
    }),
    friend_username: buildProperty({
      dataType: 'string',
      name: 'Handle de l\'ami',
      description: 'Recopié du profil de l\'ami à l\'écriture, pour qu\'une liste d\'amis ne coûte pas une lecture de profil par ligne. v1_usernames fait autorité ; les règles vérifient la copie contre la réservation.',
      readOnly: true,
    }),
    status: buildProperty({
      dataType: 'string',
      name: 'État',
      description: 'En attente tant que l\'invitation n\'a pas été acceptée. Un refus ou un retrait supprime les deux moitiés.',
      readOnly: true,
      enumValues: Object.fromEntries(FRIENDSHIP_STATUSES.map((status) => [ status, status ])),
    }),
    requested_by: buildProperty({
      dataType: 'string',
      name: 'Invitation envoyée par',
      description: 'UID de l\'auteur de l\'invitation, identique des deux côtés : c\'est lui qui donne le sens de la relation.',
      readOnly: true,
    }),
    user_id: buildProperty({
      dataType: 'string',
      name: 'Propriétaire',
      description: 'UID du titulaire de cette liste, recopié depuis le document parent.',
      readOnly: true,
    }),
    created_at: buildProperty({
      dataType: 'date',
      mode: 'date_time',
      name: 'Invité le',
      readOnly: true,
    }),
    accepted_at: buildProperty({
      dataType: 'date',
      mode: 'date_time',
      name: 'Accepté le',
      description: 'Vide tant que l\'invitation est en attente.',
      readOnly: true,
    }),
  },
});

export default userFriendsCollection;
