import { CMSType, EnumValues, User, buildCollection, buildEntityCallbacks, buildProperty } from 'firecms';
import { ulid } from 'ulid';

import {
  QUESTION_COLLECTION,
  QUESTION_MAX_OPTIONS,
  QUESTION_MIN_OPTIONS,
  QuestionData,
} from '@statowrel/models';

import dailyQuestionAnswersCollection from './v1_daily_question_answers';
import { ulidEntityId } from './entityId';

/**
 * FireCMS reads Firestore documents through its own data source, which maps
 * Firestore `Timestamp`s to `Date` — not through `questionConverter` (that one
 * is for `apps/app` and `apps/functions`, where timestamps become ISO strings).
 */
type QuestionEntity = Omit<QuestionData, 'broadcast_at' | 'closes_at' | 'answer_counts' | 'created_at'> & {
  broadcast_at: Date | null;
  closes_at: Date | null;
  /**
   * `Record<string, number>` in the model. FireCMS can only type a map whose
   * keys are known up front, and these are option ULIDs — its `keyValue` map is
   * typed `Record<string, CMSType>`, so the collection widens the value type
   * here rather than dropping the field from the backoffice.
   */
  answer_counts: Record<string, CMSType>;
  created_at: Date;
};

/**
 * Stamps the author, mints the ULID of any option that doesn't have one yet,
 * and enforces the invariants `firestore.rules` cannot: the backoffice writes
 * as an admin, and the wildcard `isAdmin()` rule lets those writes through
 * unchecked.
 */
const callbacks = buildEntityCallbacks<QuestionEntity>({
  onIdUpdate: ulidEntityId,
  onPreSave: ({ values, context }) => {
    // A question proposed from the backoffice is authored by the logged-in
    // admin; one created in the app keeps the author it already carries.
    const author_id = values.author_id || context.authController.user?.uid;

    if (!author_id) {
      throw new Error('Aucun utilisateur connecté : impossible d\'attribuer un auteur à la question.');
    }

    const options = (values.options ?? []).map((option) => ({
      ...option,
      // Never regenerate an existing id: an answer points at it.
      id: option.id || ulid(),
    }));

    if (options.length < QUESTION_MIN_OPTIONS || options.length > QUESTION_MAX_OPTIONS) {
      throw new Error(`Une question compte entre ${QUESTION_MIN_OPTIONS} et ${QUESTION_MAX_OPTIONS} options (actuellement ${options.length}).`);
    }

    if (options.some((option) => !option.label?.trim() || !option.stat_label?.trim())) {
      throw new Error('Chaque option doit avoir une réponse affichée et une StatOwrel.');
    }

    if (values.status === 'rejected' && !values.rejection_reason?.trim()) {
      throw new Error('Une question rejetée doit porter une raison de rejet, renvoyée à son auteur.');
    }

    // `answer_counts` is never seeded by hand: the answer trigger owns that
    // map, and an edit here would silently falsify every card's stat bar.
    return {
      ...values,
      author_id,
      options,
      broadcast_at: values.broadcast_at ?? null,
      broadcast_on: values.broadcast_on ?? null,
      closes_at: values.closes_at ?? null,
      answer_counts: values.answer_counts ?? {},
    };
  },
});

/**
 * The authors a moderator can pick from. Only the logged-in admin for now —
 * the real authors, proposing from the app, come later.
 */
const authorEnumValues = (user: User | null): EnumValues => (
  user ? { [user.uid]: 'Moi' } : {}
);

/** `YYYY-MM-DD`, the Paris day a question was broadcast on. */
const BROADCAST_ON_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const buildQuestionsCollection = (user: User | null) => buildCollection<QuestionEntity>({
  path: QUESTION_COLLECTION,
  name: 'Questions',
  singularName: 'Question',
  group: 'Contenu',
  icon: 'HelpOutline',
  description: 'File de modération des questions proposées par les utilisateurs, et journal de leur diffusion : une question tirée porte son jour, sa clôture, son décompte de réponses et les réponses elles-mêmes.',
  callbacks,
  subcollections: [ dailyQuestionAnswersCollection ],
  properties: {
    label: buildProperty({
      dataType: 'string',
      name: 'Question',
      description: 'Ex. « Ton dentifrice, tu le presses… »',
      validation: { required: true },
    }),
    options: buildProperty({
      dataType: 'array',
      name: 'Options',
      description: `De ${QUESTION_MIN_OPTIONS} à ${QUESTION_MAX_OPTIONS} options. L'ordre d'affichage est celui d'ici, identique pour tous les utilisateurs.`,
      validation: { required: true },
      of: buildProperty({
        dataType: 'map',
        properties: {
          id: buildProperty({
            dataType: 'string',
            name: 'ULID',
            description: 'Généré à l\'enregistrement. Une réponse pointe dessus : il ne change jamais et n\'est jamais réutilisé.',
            Field: () => null, // Hide the field in the backoffice, but keep it in the database.
            Preview: () => null, // Hide the field in the backoffice, but keep it in the database.
          }),
          label: buildProperty({
            dataType: 'string',
            name: 'Réponse affichée',
            validation: { required: true },
          }),
          stat_label: buildProperty({
            dataType: 'string',
            name: 'StatOwrel',
            description: 'Affichée comme « tu es un.e … »',
            validation: { required: true },
          }),
        },
        propertiesOrder: [ 'label', 'stat_label', 'id' ],
        previewProperties: [ 'label', 'stat_label' ],
      }),
    }),
    status: buildProperty({
      dataType: 'string',
      name: 'Statut',
      defaultValue: 'approved',
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
      name: 'Auteur',
      defaultValue: user?.uid,
      enumValues: authorEnumValues(user),
      validation: { required: true },
    }),
    broadcast_at: buildProperty({
      dataType: 'date',
      mode: 'date_time',
      name: 'Diffusée le',
      description: 'Moment où la question est poussée dans l\'app, 7h à Paris. Vide tant qu\'elle n\'a pas été tirée.',
      readOnly: true,
    }),
    broadcast_on: buildProperty({
      dataType: 'string',
      name: 'Jour de diffusion',
      description: 'Format AAAA-MM-JJ, fuseau Europe/Paris — le jour du calendrier. C\'est lui que les règles comparent à la date d\'une réponse. Vide tant que la question n\'a pas été tirée.',
      validation: { matches: BROADCAST_ON_PATTERN },
      readOnly: true,
    }),
    closes_at: buildProperty({
      dataType: 'date',
      mode: 'date_time',
      name: 'Clôturée le',
      description: 'Minuit à Paris. Passé ce délai, une réponse est un rattrapage et ne compte plus pour le streak.',
      readOnly: true,
    }),
    answer_counts: () => null, // Hide the field in the backoffice, but keep it in the database.
    created_at: buildProperty({
      dataType: 'date',
      name: 'Créée le',
      autoValue: 'on_create',
      readOnly: true,
    }),
  },
});

export default buildQuestionsCollection;
