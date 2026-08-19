import { buildCollection, buildProperty } from 'firecms';

import { QUESTION_COLLECTION, QuestionAnswerData, QuestionData } from '@statowrel/models';

/**
 * FireCMS reads Firestore documents through its own data source, which maps
 * Firestore `Timestamp`s to `Date` — not through `questionConverter` (that one
 * is for `apps/app` and `apps/functions`, where timestamps become ISO strings).
 */
type QuestionEntity = Omit<QuestionData, 'created_at' | 'submitted_at'> & {
  created_at: Date;
  submitted_at: Date | null;
};

const questionsCollection = buildCollection<QuestionEntity>({
  path: QUESTION_COLLECTION,
  name: 'Questions',
  singularName: 'Question',
  group: 'Contenu',
  icon: 'QuestionAnswer',
  description: 'Collection privée : accessible uniquement depuis ce backoffice, jamais depuis l\'application mobile.',
  properties: {
    question: buildProperty({
      dataType: 'string',
      name: 'Question',
      description: 'Ex. « Aux toilettes, tu t\'essuies... »',
      validation: { required: true },
    }),
    answers: buildProperty<Record<string, QuestionAnswerData>>({
      dataType: 'map',
      name: 'Réponses',
      description: 'Une entrée par réponse. Clé : l\'identifiant de la réponse. Valeur : une map contenant « label » (ex. « Assis ») et « title » (ex. « un.e Assis »).',
      keyValue: true,
      validation: { required: true },
    }),
    is_multiple: buildProperty({
      dataType: 'boolean',
      name: 'Réponse multiple',
      description: 'Plusieurs réponses peuvent être sélectionnées en même temps.',
      defaultValue: false,
    }),
    user_id: buildProperty({
      dataType: 'string',
      name: 'Auteur (user id)',
      validation: { required: true },
    }),
    created_at: buildProperty({
      dataType: 'date',
      name: 'Créée le',
      autoValue: 'on_create',
    }),
    submitted_at: buildProperty({
      dataType: 'date',
      name: 'Soumise le',
      description: 'Vide tant que la question n\'a pas été soumise.',
    }),
  },
});

export default questionsCollection;
