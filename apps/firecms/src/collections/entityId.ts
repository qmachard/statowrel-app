import { EntityIdUpdateProps } from 'firecms';
import { ulid } from 'ulid';

/** Crockford base32, 26 chars, first character capped at 7 by the 48-bit timestamp. */
const ULID_PATTERN = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

/**
 * Document ids are ULIDs, like option ids (docs/prd.md §5): sortable by
 * creation date, readable in the backoffice, mintable without a server
 * round-trip.
 *
 * Wire it as a collection's `onIdUpdate`. FireCMS pre-fills a Firestore auto-id
 * for a new or copied entity, then calls this on every form change: swap that
 * auto-id for a ULID once, then keep returning it. Regenerating on each
 * keystroke would move the document being written.
 */
export const ulidEntityId = ({ entityId }: EntityIdUpdateProps): string => (
  entityId && ULID_PATTERN.test(entityId) ? entityId : ulid()
);
