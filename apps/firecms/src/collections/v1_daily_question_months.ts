import { CMSType, buildCollection, buildProperty } from 'firecms';

import { DAILY_QUESTION_MONTH_COLLECTION, DailyQuestionMonthData } from '@statowrel/models';

/**
 * FireCMS reads Firestore documents through its own data source, which maps
 * Firestore `Timestamp`s to `Date` — not through `dailyQuestionMonthConverter`
 * (that one is for `apps/app` and `apps/functions`, where timestamps become ISO
 * strings).
 */
type DailyQuestionMonthEntity = Omit<DailyQuestionMonthData, 'updated_at' | 'days'> & {
  updated_at: Date;
  /**
   * `Record<string, …>` in the model. FireCMS can only type a map whose keys are
   * known up front, and these are days of the month — its `keyValue` map is
   * typed `Record<string, CMSType>`, so the collection widens the value type
   * here rather than dropping the field from the backoffice.
   */
  days: Record<string, CMSType>;
};

/**
 * Read-only index of the broadcast days, one document per month.
 *
 * Written by the backend — the daily scheduler in the same batch as the day
 * itself, and the day trigger for a day filled in by hand below — and read
 * by every app opening its calendar — it is what tells a missed day from a day
 * that never had a question (docs/prd.md §5.2). Editing it here would either
 * invent a day nobody can answer or hide one somebody already did: fix the
 * `v1_daily_questions` entry instead, and let the backend re-index it.
 */
const dailyQuestionMonthsCollection = buildCollection<DailyQuestionMonthEntity>({
  path: DAILY_QUESTION_MONTH_COLLECTION,
  name: 'Mois de diffusion',
  singularName: 'Mois de diffusion',
  group: 'Contenu',
  icon: 'CalendarMonth',
  description: 'Un document par mois : les jours où une question a été diffusée. Index de lecture du calendrier, écrit par le scheduler.',
  permissions: {
    create: false,
    edit: false,
    delete: false,
  },
  properties: {
    month: buildProperty({
      dataType: 'string',
      name: 'Mois',
      description: 'Format AAAA-MM. Sert aussi d\'identifiant au document.',
      readOnly: true,
    }),
    days: buildProperty({
      dataType: 'map',
      name: 'Jours diffusés',
      description: 'Par quantième du mois (01…31) : la question diffusée ce jour-là. Un jour sans question est absent.',
      keyValue: true,
      readOnly: true,
    }),
    updated_at: buildProperty({
      dataType: 'date',
      mode: 'date_time',
      name: 'Modifié le',
      readOnly: true,
    }),
  },
});

export default dailyQuestionMonthsCollection;
