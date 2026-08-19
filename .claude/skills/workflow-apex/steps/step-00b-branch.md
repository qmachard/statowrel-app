# Step 00b — Branch Setup

## Process

1. Check current branch via `git branch --show-current`
2. If on `main`/`master`: create feature branch `feat/{feature_name}`
   - If `{auto_mode}`: create directly
   - Else: ask user for confirmation/custom name — **MUST use `AskUserQuestion`**
3. If already on feature branch: use current branch
4. Store `{branch_name}`

## Completion Condition
When this step is complete, immediately return to `step-00-init.md` and continue from there. Do not stop between this step and the resumed step.

## Return
Return to `step-00-init.md` with `{branch_name}` set.
