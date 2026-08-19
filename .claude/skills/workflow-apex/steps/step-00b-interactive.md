# Step 00b — Interactive Configuration

## Process

1. Show current flag configuration as a numbered list
2. Ask user which flags to toggle (accept numbers, comma-separated) — **MUST use `AskUserQuestion`**
3. Apply changes
4. Enforce implications: `pr_mode` → `branch_mode`, `teams_mode` → `tasks_mode`
5. Show final configuration

## Completion Condition
When this step is complete, immediately return to `step-00-init.md` and continue from there. Do not stop between this step and the resumed step.

## Return
Return to `step-00-init.md` with updated flags.
