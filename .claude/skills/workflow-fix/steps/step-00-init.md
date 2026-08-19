# Step 00 — Initialize

## Rules
- Parse ALL flags before proceeding
- Init is ONLY about setup — don't start debugging here

## Process

1. **Parse input**: Extract `{auto_mode}` (`-a`/`--auto`), `{review_mode}` (`-r`/`--review`) and `{worktree_mode}` (`-w`/`--worktree`) flags — all default to `false`
2. **Extract error context**: Everything else becomes `{error_context}`
3. **Validate**: If `{error_context}` is empty, set to "User will provide error details during analysis"
4. **Initialize state**: Set all state variables to initial values

5. **Worktree verification** (if `{worktree_mode}`):
   - Run `git rev-parse --git-dir` and `git rev-parse --git-common-dir`
   - If they are equal → NOT in a worktree. **STOP the workflow immediately** and inform the user that `-w` requires execution inside a git worktree (e.g. `git worktree add ../<name> <branch>`). Do not proceed.
   - If they differ → confirmed inside a worktree. Capture `{branch_name}` via `git branch --show-current` and display the worktree path (`git rev-parse --show-toplevel`).

```
🔧 FIX initialized
Error: {error_context}
Mode: {auto_mode ? "auto" : "interactive"}{review_mode ? " · review" : ""}{worktree_mode ? " · worktree" : ""}
```

## Completion Condition
When this step is complete, immediately load and execute `step-01-analyze.md`. Do not stop between this step and the next step.

## Next
Load `step-01-analyze.md`
