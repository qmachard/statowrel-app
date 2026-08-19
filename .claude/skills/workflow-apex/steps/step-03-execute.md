# Step 03 — Execute (Solo)

Implement the plan file by file. You are the implementer.

## Rules
- NEVER deviate from the plan
- NEVER add features not in the plan
- Read files BEFORE editing
- Commit after each logical unit (if `{branch_mode}`)
- In `{worktree_mode}`: commit AND push after each completed modification so the user can review locally
- Use gitmoji commit format

## Process

For each task/file change from the plan, in order:

1. **Mark in-progress**: TaskUpdate status
2. **Read** the file (or confirm it doesn't exist yet)
3. **Implement** the planned changes
4. **Mark complete**: TaskUpdate status
5. **Commit** (if `{branch_mode}` or `{worktree_mode}`): `git add <files> && git commit -m "<gitmoji> <description>"` — use ONLY explicit file paths, never `git add .` or `git add -A`
6. **Push** (if `{worktree_mode}`): `git push -u origin {branch_name}` immediately after the commit so the user can review locally. First push sets upstream; subsequent pushes are plain `git push`. No confirmation needed in worktree mode — the user opted in via `-w`.
7. **Log progress** (if `{save_mode}`): append to output file

### Economy Mode (⚡)
Same process, but:
- No exploration beyond what's planned
- Minimal validation between tasks
- Batch commits when possible

## Output

```
✅ Implementation complete

Files changed:
- path/file.ts (modified) — [what changed]
- path/new.ts (created) — [what it does]

Commits: N commits on {branch_name}
```

## Completion Condition
When this step is complete, immediately load and execute `step-04-validate.md`. Do not stop between this step and the next step.

## Next
Load `step-04-validate.md`
