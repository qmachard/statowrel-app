import { CMSType, buildCollection, buildProperty } from 'firecms';

import { USER_CALENDAR_MONTH_COLLECTION, UserCalendarMonthData } from '@statowrel/models';

/**
 * FireCMS reads Firestore documents through its own data source, which maps
 * Firestore `Timestamp`s to `Date` — not through `userCalendarMonthConverter`
 * (that one is for `apps/app` and `apps/functions`, where timestamps become ISO
 * strings).
 */
type UserCalendarMonthEntity = Omit<UserCalendarMonthData, 'updated_at' | 'days'> & {
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
 * Sub-collection of `v1_users`, wired into it via `subcollections`.
 *
 * Read-only, and here for diagnosis only: this is a projection of the answers,
 * not a source of truth. Editing a month would make the calendar disagree with
 * the answers it is derived from, without touching a single one of them.
 */
const userCalendarMonthsCollection = buildCollection<UserCalendarMonthEntity>({
  path: USER_CALENDAR_MONTH_COLLECTION,
  name: 'Calendrier',
  singularName: 'Mois',
  icon: 'CalendarMonth',
  description: 'Un document par mois : les jours répondus par cet utilisateur. Dérivé des réponses par le trigger, pour que l\'écran Stats charge un mois en une lecture.',
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
      name: 'Jours répondus',
      description: 'Par quantième du mois (01…31) : option choisie, StatOwrel obtenu, rattrapage ou non. Un jour sans réponse est absent.',
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

export default userCalendarMonthsCollection;
