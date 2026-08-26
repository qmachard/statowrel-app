import {
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
  getDoc,
  getDocs,
} from '@react-native-firebase/firestore';

/**
 * Every Firestore read of the app, said out loud — in a development build, and
 * only there.
 *
 * Firestore bills **per document returned**, never per call, which makes the
 * cost of a screen impossible to reason about from the code alone: a listener
 * is one line and an unbounded number of reads, a `getFrozenDoc` is one line
 * and often none at all. This module is what makes that visible while the app
 * is being used — one line per read, saying what it cost, where it came from
 * and who asked for it:
 *
 *     [firestore] +1 server · v1_questions/01M0HNM3RQ… · day:tally · 7 reads this run
 *     [firestore] +0 cache  · v1_daily_question_months/2026-07 · day:month index · 7 reads this run
 *
 * The running total is the point of the exercise. Opening the same day twice
 * and watching it move by one rather than by two is the whole difference
 * between the day screen as it was — subscribed to a tally the entire app
 * writes to — and as it is.
 *
 * **The numbers are what the client can tell, not an invoice.** A `getDoc` on a
 * document that does not exist still bills one read, and is counted here as
 * one. A listener's first snapshot bills its whole result set and each one
 * after it bills what changed, which is what `logSnapshot` counts — but a
 * listener re-established after a short break resumes from a token rather than
 * re-reading, and nothing on the client says whether that happened. Read it as
 * an upper bound of the same shape as the bill, not as the bill.
 *
 * Nothing here survives a release build: every line is behind `__DEV__`, which
 * Metro resolves to `false` and drops the branch of.
 */

type ReadSource = 'server' | 'cache' | 'listen';

let billedThisRun = 0;

const shorten = (path: string): string => path
  .split('/')
  .map((segment) => (segment.length > 14 ? `${segment.slice(0, 12)}…` : segment))
  .join('/');

/**
 * One read, one line. `billed` is how many documents Firestore would charge for
 * — zero for a cache hit, the size of a snapshot for a listener.
 */
export const logRead = (label: string, path: string, billed: number, source: ReadSource): void => {
  if (!__DEV__) {
    return;
  }

  billedThisRun += billed;

  console.log(
    `[firestore] +${billed} ${source.padEnd(6)} · ${shorten(path)} · ${label} · ${billedThisRun} reads this run`,
  );
};

/**
 * What a listener's snapshot costs: its whole result set the first time, then
 * the documents that changed. Pass the snapshot's own size for the first and
 * `docChanges().length` for the rest — a document listener is simply 1 and 1.
 */
export const logSnapshot = (label: string, path: string, billed: number): void => {
  logRead(label, path, billed, 'listen');
};

/**
 * `getDoc`, said out loud. The label is required rather than optional on
 * purpose: a read nobody can name in three words on the way past is a read
 * nobody will recognise in the log either.
 */
export const readDoc = async <TModelData extends DocumentData, TFirebaseData extends DocumentData>(
  reference: DocumentReference<TModelData, TFirebaseData>,
  label: string,
): Promise<DocumentSnapshot<TModelData, TFirebaseData>> => {
  const snapshot = await getDoc(reference);

  // Billed all the same when the document is not there: Firestore charges one
  // read for the answer « it does not exist ».
  logRead(label, reference.path, 1, 'server');

  return snapshot;
};

/**
 * `getDocs`, said out loud. The path is passed rather than read off the query —
 * a `Query` does not carry one — so it is the collection the query runs on.
 */
export const readDocs = async <TModelData extends DocumentData, TFirebaseData extends DocumentData>(
  queryRef: Query<TModelData, TFirebaseData>,
  label: string,
  path: string,
): Promise<QuerySnapshot<TModelData, TFirebaseData>> => {
  const snapshot = await getDocs(queryRef);

  // A query that matches nothing is billed one read, the same way a missing
  // document is — hence the floor rather than a bare `snapshot.size`.
  logRead(label, path, Math.max(snapshot.size, 1), 'server');

  return snapshot;
};
