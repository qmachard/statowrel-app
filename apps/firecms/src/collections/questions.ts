import { buildCollection, buildEntityCallbacks, buildProperty } from 'firecms';

import {
  QUESTION_COLLECTION,
  QUESTION_MAX_OPTIONS,
  QUESTION_MIN_OPTIONS,
  QuestionData,
  QuestionOptionData,
  sortQuestionOptions,
} from '@statowrel/models';

import QuestionOptionsField from './fields/QuestionOptionsField';

/**
 * FireCMS reads Firestore documents through its own data source, which maps
 * Firestore `Timestamp`s to `Date` — not through `questionConverter` (that one
 * is for `apps/app` and `apps/functions`, where timestamps become ISO strings).
 */
type QuestionEntity = Omit<QuestionData, 'created_at'> & {
  created_at: Date;
};

/**
 * The 2–6 options rule and the rejection-reason rule are enforced here as well
 * as in `firestore.rules`: the backoffice writes as an admin, and the wildcard
 * `isAdmin()` rule lets those writes through unchecked.
 */
const callbacks = buildEntityCallbacks<QuestionEntity>({
  onPreSave: ({ values }) => {
    const options = sortQuestionOptions(values.options);

    if (options.length < QUESTION_MIN_OPTIONS || options.length > QUESTION_MAX_OPTIONS) {
      throw new Error(`Une question compte entre ${QUESTION_MIN_OPTIONS} et ${QUESTION_MAX_OPTIONS} options (actuellement ${options.length}).`);
    }

    if (options.some((option) => !option.label.trim() || !option.stat_label.trim())) {
      throw new Error('Chaque option doit avoir une réponse affichée et une StatOwrel.');
    }

    if (values.status === 'rejected' && !values.rejection_reason?.trim()) {
      throw new Error('Une question rejetée doit porter une raison de rejet, renvoyée à son auteur.');
    }

    return values;
  },
});

const questionsCollection = buildCollection<QuestionEntity>({
  path: QUESTION_COLLECTION,
  name: 'Questions',
  singularName: 'Question',
  group: 'Contenu',
  icon: 'HelpOutline',
  description: 'File de modération des questions proposées par les utilisateurs. Rien n\'est public : un auteur ne relit que ses propres propositions.',
  callbacks,
  properties: {
    label: buildProperty({
      dataType: 'string',
      name: 'Question',
      description: 'Ex. « Ton dentifrice, tu le presses… »',
      validation: { required: true },
    }),
    options: buildProperty<Record<string, QuestionOptionData>>({
      dataType: 'map',
      name: 'Options',
      description: `De ${QUESTION_MIN_OPTIONS} à ${QUESTION_MAX_OPTIONS} options. L'ordre affiché est celui d'ici, identique pour tous les utilisateurs.`,
      // Custom editor: the map is keyed by ULID, and FireCMS can only type a
      // map's sub-properties when the keys are known up front. `keyValue` stays
      // on so the collection table still previews the raw map.
      keyValue: true,
      Field: QuestionOptionsField,
      validation: { required: true },
    }),
    status: buildProperty({
      dataType: 'string',
      name: 'Statut',
      defaultValue: 'pending',
      validation: { required: true },
      enumValues: {
        pending: 'En attente',
        approved: 'Validée',
        rejected: 'Rejetée',
        used: 'Diffusée',
      },
    }),
    rejection_reason: buildProperty({
      dataType: 'string',
      name: 'Raison du rejet',
      description: 'Renvoyée à l\'auteur. Obligatoire si le statut est « Rejetée », vide sinon.',
      multiline: true,
    }),
    author_id: buildProperty({
      dataType: 'string',
      name: 'Auteur (user id)',
      validation: { required: true },
    }),
    created_at: buildProperty({
      dataType: 'date',
      name: 'Créée le',
      autoValue: 'on_create',
      readOnly: true,
    }),
  },
});

export default questionsCollection;
