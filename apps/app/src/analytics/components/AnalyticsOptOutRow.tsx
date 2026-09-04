import { BarChart3 } from '@/components/icons';

import { Button } from '@/components/Button';
import { useAnalyticsOptOut } from '@/analytics/preferences';

/**
 * The Menu's opt-out switch, alongside `NotificationsButton` and the sign-out
 * block. Same neobrutalist `Button` treatment as its neighbour — a separate
 * `Switch` primitive would read as a second UI language here.
 *
 * **Silent opt-out**: analytics are on by default (see `docs/analytics.md`
 * § Consent model — no personal data, no ad tracking, no third-party sharing,
 * finalité produit strictement interne). The switch never blocks anything; a
 * tap flips the state and the wrapper's very next call reads the change.
 *
 * The row is deliberately unrenderable while the flag is being read, to avoid
 * showing a state that would flip a beat later — same rule as
 * `NotificationsButton`.
 */
export const AnalyticsOptOutRow = () => {
  const { resolved, optedOut, setOptedOut } = useAnalyticsOptOut();

  if (!resolved) {
    return null;
  }

  return (
    <Button
      label={optedOut ? 'Statistiques désactivées' : 'Statistiques d’usage activées'}
      description={optedOut
        ? 'On ne collecte plus rien depuis ce téléphone'
        : 'Anonymes, pas de pub, jamais partagées'}
      variant={optedOut ? 'secondary' : 'ghost'}
      icon={BarChart3}
      onPress={() => setOptedOut(!optedOut)}
    />
  );
};
