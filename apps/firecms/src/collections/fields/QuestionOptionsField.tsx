import { ChangeEvent } from 'react';

import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Box, Button, FormHelperText, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { FieldDescription, FieldProps } from 'firecms';
import { ulid } from 'ulid';

import {
  QUESTION_MAX_OPTIONS,
  QUESTION_MIN_OPTIONS,
  QuestionOptionData,
  QuestionOptionEntry,
  sortQuestionOptions,
} from '@statowrel/models';

type QuestionOptions = Record<string, QuestionOptionData>;

/**
 * Rewrites `position` densely from the array order, so the stored order always
 * matches what the moderator sees. Option ULIDs are never touched: a recorded
 * answer points at one, so reordering or renaming must not repoint it.
 */
const toMap = (entries: QuestionOptionEntry[]): QuestionOptions => (
  entries.reduce<QuestionOptions>((acc, entry, position) => {
    acc[entry.id] = {
      label: entry.label,
      stat_label: entry.stat_label,
      position,
    };

    return acc;
  }, {})
);

/**
 * Editor for `v1_questions.options`. FireCMS v2 can only type a map's
 * sub-properties when the keys are known up front, and these keys are ULIDs —
 * hence a custom field rather than the built-in key/value editor.
 */
export default function QuestionOptionsField({
  value,
  setValue,
  error,
  showError,
  property,
  includeDescription,
  isSubmitting,
}: FieldProps<QuestionOptions>) {
  const entries = sortQuestionOptions(value);

  const commit = (next: QuestionOptionEntry[]) => setValue(toMap(next));

  const patch = (id: string, changes: Partial<QuestionOptionEntry>) => (
    commit(entries.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)))
  );

  const move = (index: number, offset: number) => {
    const next = [ ...entries ];
    const [ moved ] = next.splice(index, 1);

    if (!moved) {
      return;
    }

    next.splice(index + offset, 0, moved);
    commit(next);
  };

  const addOption = () => commit([
    ...entries,
    // ULID generated here: the point of the format is that a client can mint an
    // option id without a server round-trip (docs/prd.md §5).
    { id: ulid(), label: '', stat_label: '', position: entries.length },
  ]);

  const outOfRange = entries.length < QUESTION_MIN_OPTIONS || entries.length > QUESTION_MAX_OPTIONS;

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{property.name ?? 'Options'}</Typography>

      <Stack spacing={1}>
        {entries.map((entry, index) => (
          <Paper key={entry.id} variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                label="Réponse affichée"
                placeholder="Par le bout"
                size="small"
                fullWidth
                disabled={isSubmitting}
                value={entry.label}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patch(entry.id, { label: event.target.value })}
              />
              <TextField
                label="StatOwrel"
                placeholder="méthodique"
                helperText="Affichée comme « tu es un.e … »"
                size="small"
                fullWidth
                disabled={isSubmitting}
                value={entry.stat_label}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patch(entry.id, { stat_label: event.target.value })}
              />
              <Tooltip title="Monter">
                <span>
                  <IconButton size="small" disabled={isSubmitting || index === 0} onClick={() => move(index, -1)}>
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Descendre">
                <span>
                  <IconButton size="small" disabled={isSubmitting || index === entries.length - 1} onClick={() => move(index, 1)}>
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Supprimer">
                <span>
                  <IconButton
                    size="small"
                    disabled={isSubmitting}
                    onClick={() => commit(entries.filter((candidate) => candidate.id !== entry.id))}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
            <Typography variant="caption" color="text.secondary">{entry.id}</Typography>
          </Paper>
        ))}
      </Stack>

      <Button
        size="small"
        startIcon={<AddIcon />}
        sx={{ mt: 1 }}
        disabled={isSubmitting || entries.length >= QUESTION_MAX_OPTIONS}
        onClick={addOption}
      >
        Ajouter une option
      </Button>

      {outOfRange && (
        <FormHelperText error>
          {`Une question compte entre ${QUESTION_MIN_OPTIONS} et ${QUESTION_MAX_OPTIONS} options (actuellement ${entries.length}).`}
        </FormHelperText>
      )}

      {showError && typeof error === 'string' && <FormHelperText error>{error}</FormHelperText>}

      {includeDescription && <FieldDescription property={property} />}
    </Box>
  );
}
