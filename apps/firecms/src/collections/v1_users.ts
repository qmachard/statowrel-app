import { buildCollection, buildEntityCallbacks, buildProperty } from 'firecms';

import { AUTH_PROVIDER_IDS, USER_COLLECTION, UserData, isValidUsername, normalizeUsername } from '@statowrel/models';

/**
 * FireCMS reads Firestore documents through its own data source, which maps
 * Firestore `Timestamp`s to `Date` — not through `userConverter` (that one is
 * for `apps/app` and `apps/functions`, where timestamps become ISO strings).
 */
type UserEntity = Omit<UserData, 'created_at' | 'updated_at'> & {
  created_at: Date;
  updated_at: Date;
};

/**
 * No `onIdUpdate` here, unlike every other collection: a user document is keyed
 * by its Firebase Auth UID, which the backoffice cannot mint. Creating a
 * profile from here means pasting the UID of an existing account.
 */
const callbacks = buildEntityCallbacks<UserEntity>({
  onPreSave: ({ values }) => {
    const username = normalizeUsername(values.username ?? '');

    // The backoffice does not hold the `v1_usernames` reservation that makes a
    // handle unique, so it only ever checks its shape — renaming someone from
    // here would leave the reservation behind and is deliberately not offered.
    if (!isValidUsername(username)) {
      throw new Error('Un profil doit porter un nom d\'utilisateur valide.');
    }

    return {
      ...values,
      username,
      photo_url: values.photo_url || null,
      email: values.email || null,
      auth_providers: values.auth_providers ?? [],
    };
  },
});

const usersCollection = buildCollection<UserEntity>({
  path: USER_COLLECTION,
  name: 'Utilisateurs',
  singularName: 'Utilisateur',
  group: 'Utilisateurs',
  icon: 'Person',
  description: 'Profils des comptes de l\'app. L\'identifiant du document est l\'UID Firebase Auth.',
  callbacks,
  permissions: {
    create: false,
    edit: false,
  },
  properties: {
    username: buildProperty({
      dataType: 'string',
      name: 'Nom d\'utilisateur',
      description: 'Unique, choisi à la première connexion. Réservé dans v1_usernames, qui fait autorité.',
      validation: { required: true },
      readOnly: true,
    }),
    photo_url: buildProperty({
      dataType: 'string',
      name: 'Avatar',
      description: 'URL de l\'image de profil. Vide si l\'utilisateur n\'en a pas.',
      url: 'image',
    }),
    email: buildProperty({
      dataType: 'string',
      name: 'Email',
      description: 'Miroir de Firebase Auth, écrit par l\'app à la connexion. Vide si aucun provider n\'en fournit.',
      readOnly: true,
    }),
    auth_providers: buildProperty({
      dataType: 'array',
      name: 'Providers',
      description: 'Méthodes de connexion liées au compte. Miroir de Firebase Auth, écrit par l\'app.',
      readOnly: true,
      of: {
        dataType: 'string',
        enumValues: Object.fromEntries(AUTH_PROVIDER_IDS.map((provider) => [ provider, provider ])),
      },
    }),
    created_at: buildProperty({
      dataType: 'date',
      name: 'Créé le',
      autoValue: 'on_create',
      readOnly: true,
    }),
    updated_at: buildProperty({
      dataType: 'date',
      name: 'Modifié le',
      autoValue: 'on_update',
      readOnly: true,
    }),
    streak_count: buildProperty({
      dataType: 'number',
      name: 'Streak',
      description: 'Jours d\'affilée répondus à l\'heure. Tenu par le backend : le trigger de réponse l\'incrémente, le scheduler de minuit le remet à zéro.',
      readOnly: true,
    }),
    streak_best: buildProperty({
      dataType: 'number',
      name: 'Meilleur streak',
      description: 'Plus long streak jamais atteint.',
      readOnly: true,
    }),
    streak_last_answered_on: buildProperty({
      dataType: 'string',
      name: 'Dernière réponse à l\'heure',
      description: 'Jour au format AAAA-MM-JJ. Vide tant que l\'utilisateur n\'a jamais répondu à l\'heure.',
      readOnly: true,
    }),
  },
});

export default usersCollection;
