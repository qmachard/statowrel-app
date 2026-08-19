import { CMSType, EntityIdUpdateProps, buildCollection, buildEntityCallbacks, buildProperty } from 'firecms';

import { DAILY_QUESTION_COLLECTION, DailyQuestionData, QUESTION_COLLECTION } from '@statowrel/models';

import dailyQuestionAnswersCollection from './v1_daily_question_answers';

/**
 * FireCMS reads Firestore documents through its own data source, which maps
 * Firestore `Timestamp`s to `Date` — not through `dailyQuestionConverter` (that
 * one is for `apps/app` and `apps/functions`, where timestamps become ISO
 * strings).
 */
type DailyQuestionEntity = Omit<DailyQuestionData, 'published_at' | 'closes_at' | 'answer_counts'> & {
  published_at: Date;
  closes_at: Date;
  /**
   * `Record<string, number>` in the model. FireCMS can only type a map whose
   * keys are known up front, and these are option ULIDs — its `keyValue` map
   * is typed `Record<string, CMSType>`, so the collection widens the value
   * type here rather than dropping the field from the backoffice.
   */
  answer_counts: Record<string, CMSType>;
};

/** `YYYY-MM-DD`, the day key a daily question is stored under. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * No `ulidEntityId` here, unlike `v1_questions`: a daily question's id is its
 * `YYYY-MM-DD` date, so the app reads today's question by building the id
 * instead of querying for it, and the day can never exist twice. The id
 * therefore follows the `date` field rather than being minted.
 */
const dateEntityId = ({ entityId, values }: EntityIdUpdateProps<DailyQuestionEntity>): string => (
  values.date?.trim() || entityId || ''
);

const callbacks = buildEntityCallbacks<DailyQuestionEntity>({
  onIdUpdate: dateEntityId,
  onPreSave: ({ values }) => {
    const date = values.date?.trim();

    if (!date || !DATE_PATTERN.test(date)) {
      throw new Error('La date doit être au format AAAA-MM-JJ : c\'est elle qui sert d\'identifiant au document.');
    }

    if (!values.question_id?.trim()) {
      throw new Error('Une question du jour doit pointer sur une question du pot.');
    }

    // Never seeded by hand: the answer trigger owns this map, and an edit here
    // would silently falsify every card's stat bar for that day.
    return { ...values, date, answer_counts: values.answer_counts ?? {} };
  },
});

const dailyQuestionsCollection = buildCollection<DailyQuestionEntity>({
  path: DAILY_QUESTION_COLLECTION,
  name: 'Questions du jour',
  singularName: 'Question du jour',
  group: 'Contenu',
  icon: 'Today',
  description: 'Une entrée par jour : la question diffusée et le décompte des réponses. Programmée par le backend ; à remplir à la main tant qu\'il n\'existe pas.',
  callbacks,
  subcollections: [ dailyQuestionAnswersCollection ],
  properties: {
    date: buildProperty({
      dataType: 'string',
      name: 'Jour',
      description: 'Format AAAA-MM-JJ, fuseau Europe/Paris. Sert aussi d\'identifiant au document.',
      validation: { required: true, matches: DATE_PATTERN },
    }),
    question_id: buildProperty({
      dataType: 'string',
      name: 'Question',
      description: `Identifiant du document dans ${QUESTION_COLLECTION}. Cette question passe au statut « Diffusée ».`,
      validation: { required: true },
    }),
    published_at: buildProperty({
      dataType: 'date',
      mode: 'date_time',
      name: 'Publiée le',
      description: 'Moment où la question est poussée dans l\'app. L\'heure varie d\'un jour à l\'autre.',
      validation: { required: true },
    }),
    closes_at: buildProperty({
      dataType: 'date',
      mode: 'date_time',
      name: 'Clôturée le',
      description: 'Minuit à Paris. Passé ce délai, une réponse est un rattrapage et ne compte plus pour le streak.',
      validation: { required: true },
    }),
    answer_counts: buildProperty({
      dataType: 'map',
      name: 'Réponses par option',
      description: 'Total par ULID d\'option, incrémenté par le backend à chaque réponse. Une option sans réponse est absente.',
      keyValue: true,
      readOnly: true,
    }),
  },
});

export default dailyQuestionsCollection;
