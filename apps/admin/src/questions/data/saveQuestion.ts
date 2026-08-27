import { Timestamp, setDoc, updateDoc } from 'firebase/firestore';
import { ulid } from 'ulid';

import {
  QUESTION_COLLECTION,
  type QuestionData,
  type QuestionOptionData,
  type QuestionStatus,
  questionConverter,
} from '@statowrel/models';

import { getDocumentRef } from '@/lib/firestore';

import type { QuestionValues } from '../schemas';

const questionRef = (id: string) => getDocumentRef(QUESTION_COLLECTION, id, questionConverter);

/**
 * Never regenerates an id an option already carries: a recorded answer and its
 * `answer_counts` entry both point at it, so reordering or reformulating an
 * option must not repoint what people picked.
 */
const withOptionIds = (options: QuestionValues['options']): QuestionOptionData[] => (
  options.map((option) => ({
    id: option.id || ulid(),
    label: option.label,
    stat_label: option.stat_label,
  }))
);

/**
 * Whoever the question is credited to — the signed-in moderator, both halves of
 * them: the UID the rules check ownership on, and the handle the question
 * carries so naming its author costs no read (`author_username`).
 *
 * Handed in rather than resolved here, and by `AuthContext`, which reads the
 * profile once when the session opens: resolving it at this call site would be
 * one profile read per question written. A `null` handle is a moderator with no
 * app account — the question is written uncredited rather than not written.
 */
export interface QuestionAuthor {
  id: string;
  username: string | null;
}

/**
 * Drops a proposal into the moderation pot (docs/prd.md §4.7).
 *
 * The document id is a ULID. Everything a drawn question carries stays null:
 * the daily scheduler owns `broadcast_at` / `broadcast_on` / `closes_at`, and
 * `firestore.rules` denies a create that pre-fills them. `answer_counts` is
 * seeded empty and never written by hand — the answer trigger owns that map.
 */
export const createQuestion = async (author: QuestionAuthor, values: QuestionValues): Promise<void> => {
  const question: QuestionData = {
    label: values.label,
    options: withOptionIds(values.options),
    status: 'pending',
    author_id: author.id,
    author_username: author.username,
    rejection_reason: null,
    broadcast_at: null,
    broadcast_on: null,
    closes_at: null,
    answer_counts: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await setDoc(questionRef(ulid()), question);
};

/**
 * Rewrites the wording of an existing question, and nothing else — an `update()`
 * on the two fields a moderator edits rather than a whole-document `set()`,
 * and never the paternity: `author_id` and its `author_username` copy are set
 * when the question is written and are not what an edit is about,
 * which would carry back the `answer_counts` and the broadcast stamps read a
 * moment ago and revert whatever the backend wrote in between.
 */
export const updateQuestion = async (id: string, values: QuestionValues): Promise<void> => {
  await updateDoc(questionRef(id), {
    label: values.label,
    options: withOptionIds(values.options),
    // A `Timestamp` and not an ISO string: `update()` does not run the
    // converter (see the repo's CLAUDE.md), so the value written here is the
    // value stored.
    updated_at: Timestamp.now(),
  });
};

/**
 * Moderation verdict (docs/prd.md §4.7). An approved question joins the common
 * pot and becomes eligible for the daily draw; a rejected one carries the reason
 * sent back to its author, which is the one field the model requires alongside
 * that status.
 */
export const setQuestionStatus = async (
  id: string,
  status: QuestionStatus,
  rejectionReason: string | null = null,
): Promise<void> => {
  await updateDoc(questionRef(id), {
    status,
    rejection_reason: rejectionReason,
    updated_at: Timestamp.now(),
  });
};

