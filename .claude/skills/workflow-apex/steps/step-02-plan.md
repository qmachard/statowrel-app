# Step 02 — Plan

Strategic planning. Create file-by-file implementation strategy.

## Rules
- NEVER start implementing — this is planning only
- Structure plan by FILE, not by feature
- Think hard before committing to a strategy — planning errors cost more than execution errors

## Process

1. **Think deeply** about the implementation strategy:
   - What files need to change and in what order
   - What are the dependencies between changes
   - What could go wrong

2. **Clarify ambiguities**: if anything is unclear, ask the user (unless `{auto_mode}`) — **MUST use `AskUserQuestion`**

3. **Create implementation plan** — organized by file:
   ```
   ## Implementation Plan

   ### 1. path/to/file.ts (modify)
   - What changes and why
   - Dependencies: none / file X must be done first

   ### 2. path/to/new-file.ts (create)
   - What this file does
   - Dependencies: file 1
   ```

4. **Check PR reviewability** — see `## PR Split Check` below. A plan that ships as one oversized PR gets rubber-stamped, not reviewed.

5. **Validate with `team-pm`** (Agent, subagent_type: `team-pm`, **`run_in_background: false`**) — unless economy mode:
   - Check acceptance criteria coverage
   - Verify each AC maps to at least one file change
   - Flag any gaps

6. **Create task list** — scoped to `{current_slice}` only when the plan was split:
   - `TaskCreate` for each planned file change (`subject`, `description`, `activeForm`) — it creates tasks as `pending` with no dependencies
   - Then wire the graph with `TaskUpdate` using `addBlockedBy` / `addBlocks` — dependencies CANNOT be set at creation time

7. **Present summary** and ask smart questions (not generic "ready to proceed?") — **MUST use `AskUserQuestion`**

## PR Split Check

A reviewer's attention is finite: past a certain size, a PR stops being reviewed and starts being approved. Before locking the plan, assess whether it should ship as **several sequential PRs** instead of one.

1. **Estimate the diff** from the plan: number of files touched, rough lines added/removed, and the number of **independent concerns** (a concern = something that could be merged and shipped on its own — a mechanical refactor, a data migration, a new endpoint, a UI screen, a dependency bump).

2. **Trigger the alert** when ANY of these holds:
   - more than ~400 changed lines, OR
   - more than ~15 files touched, OR
   - 2+ independent concerns that do not need to land together (typically: refactor/rename mixed with behaviour change, backend + frontend that could be merged behind a flag, migration + feature).

   Below all thresholds → note `PR: single PR, reviewable` in the summary and continue to step 5.

3. **Propose a split** — cut along seams that keep each PR *independently reviewable and mergeable*, ordered by dependency. Prefer: pure refactor/prep first (no behaviour change), then the feature, then the cleanup. Never cut mid-concern just to hit a line count — a split that leaves the repo broken between PRs is worse than one big PR.

   ```
   ⚠️ Plan too large for a single review — ~{lines} lines / {files} files / {concerns} concerns

   Proposed split:
   1. [PR 1 title] — {files} files, ~{lines} lines — {what it does, why it stands alone}
   2. [PR 2 title] — depends on PR 1 — ...
   3. [PR 3 title] — ...
   ```

4. **Ask the user** — **MUST use `AskUserQuestion`** — options:
   - **"Split — start with PR 1"** (recommended): the rest of this APEX run implements slice 1 ONLY. Store the slice in `{current_slice}` and the remaining slices in `{deferred_slices}`.
   - **"Keep one PR"**: proceed with the full plan, no change.
   - **"Adjust the split"**: let the user re-cut the boundaries, then re-present.

   In `{auto_mode}`: do NOT split — keep one PR and record the recommended split in `{deferred_slices}` so it reaches the final summary.

5. **Apply the decision** — when a slice is selected, narrow the implementation plan to that slice's files before continuing. The deferred slices are carried untouched to step-09 and reported there as follow-up PRs; do not implement them in this run.

## Completion Condition
When this step is complete, immediately load the routed next step from this step's process or Next section. Do not stop between this step and the selected next step.

## Next
- If `{tasks_mode}` or `{teams_mode}` → load `step-02b-tasks.md`
- Else → load `step-03-execute.md`
