# Step 00 — Initialize

## Rules
- Parse ALL flags before any other action
- `pr_mode` implies `branch_mode`
- `worktree_mode` implies `branch_mode`
- `teams_mode` implies `tasks_mode`
- All flags default to `false` — including `examine_mode`, which only turns on with `-x` / `--examine`

## Process

1. **Parse input**: Extract `{task_description}` and all flags from user message
2. **Generate identifiers**: `{feature_name}` (kebab-case) and `{task_id}` (NN-feature-name)

3. **Worktree verification** (if `{worktree_mode}`):
   - Run `git rev-parse --git-dir` and `git rev-parse --git-common-dir`
   - If they are equal → NOT in a worktree. **STOP the workflow immediately** and inform the user that `-w` requires execution inside a git worktree (e.g. created via `git worktree add ../<name> <branch>`). Do not proceed.
   - If they differ → confirmed inside a worktree. Capture and display the worktree path (`git rev-parse --show-toplevel`) and current branch.
   - Verify a remote tracking branch is configured or will be created at first push (`git config --get branch.$(git branch --show-current).remote` may be empty — that's fine, the first push will set it up).

4. **Sub-steps** (conditional):
   - If `{interactive_mode}` → load `step-00b-interactive.md`, return here
   - If `{branch_mode}` → load `step-00b-branch.md`, return here
   - If `{save_mode}` → load `step-00b-save.md`, return here

5. **Show summary** (compact, one table):

```
🚀 APEX initialized: {task_id}
┌──────────┬───────┐
│ Flag     │ State │
├──────────┼───────┤
│ auto     │ ✓/✗   │
│ branch   │ ✓/✗   │
│ worktree │ ✓/✗   │
│ ...      │       │
└──────────┴───────┘
```

## Completion Condition
When this step is complete, immediately load the routed next step from this step's process or Next section. Do not stop between this step and the selected next step.

## Next
Proceed to `step-01-analyze.md` immediately.
