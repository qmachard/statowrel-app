import { buildCollection, buildProperty } from 'firecms';

import { DAILY_QUESTION_ANSWER_COLLECTION, DailyQuestionAnswerData } from '@statowrel/models';

/**
 * FireCMS reads Firestore documents through its own data source, which maps
 * Firestore `Timestamp`s to `Date` — not through `dailyQuestionAnswerConverter`
 * (that one is for `apps/app` and `apps/functions`, where timestamps become ISO
 * strings).
 */
type DailyQuestionAnswerEntity = Omit<DailyQuestionAnswerData, 'answered_at'> & {
  answered_at: Date;
};

/**
 * Sub-collection of `v1_questions`, wired into it via `subcollections`.
 *
 * Read-only: an answer is final (docs/prd.md §4.2), and editing one here would
 * desynchronise it from the `answer_counts` the trigger has already
 * incremented. Deleting one is a backend job — it has to decrement the map in
 * the same pass.
 */
const dailyQuestionAnswersCollection = buildCollection<DailyQuestionAnswerEntity>({
  path: DAILY_QUESTION_ANSWER_COLLECTION,
  name: 'Réponses',
  singularName: 'Réponse',
  icon: 'HowToVote',
  description: 'Une réponse par utilisateur pour cette question. L\'identifiant du document est l\'UID Firebase Auth de son auteur.',
  permissions: {
    create: false,
    edit: false,
    delete: false,
  },
  properties: {
    user_id: buildProperty({
      dataType: 'string',
      name: 'Utilisateur',
      description: 'UID Firebase Auth, identique à l\'identifiant du document.',
      readOnly: true,
    }),
    question_id: buildProperty({
      dataType: 'string',
      name: 'Question',
      description: 'Recopié de la question parente, identique à l\'identifiant du document parent.',
      readOnly: true,
    }),
    option_id: buildProperty({
      dataType: 'string',
      name: 'Option choisie',
      description: 'ULID de l\'option dans la question — jamais sa position.',
      readOnly: true,
    }),
    date: buildProperty({
      dataType: 'string',
      name: 'Jour',
      description: 'Jour de diffusion de la question parente, recopié pour que le calendrier se lise en une requête de groupe.',
      readOnly: true,
    }),
    answered_at: buildProperty({
      dataType: 'date',
      mode: 'date_time',
      name: 'Répondu le',
      readOnly: true,
    }),
    late: buildProperty({
      dataType: 'boolean',
      name: 'Rattrapage',
      description: 'Réponse donnée après la clôture : elle complète le calendrier mais ne restaure pas le streak.',
      readOnly: true,
    }),
  },
});

export default dailyQuestionAnswersCollection;
