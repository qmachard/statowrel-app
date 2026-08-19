# Step 09 — Finish

Wrap up workflow: reconcile docs, push, create PR.

## Rules
- NEVER push without user confirmation (unless `{auto_mode}` or `{pr_mode}`) — **MUST use `AskUserQuestion`**
- When `{pr_mode}`: the `-p`/`--pr` flag pre-authorizes push + PR. Push and create the PR directly — no confirmation. The branch is already guaranteed non-`main`/`master` (verified at init step-00b), so no extra check is needed.
- NEVER create PR with uncommitted changes
- Reconcile the project docs BEFORE the final commit — see the section below

## Reconcile Project Docs (run BEFORE the final commit — `team-pm` · `team-architect` · `team-ux`)

Implementation always drifts from the plan. Before wrapping up, propagate the **decisions taken during execution** back into the project docs while the context is fresh, so PRD / architecture / UX stay honest.

1. **Collect implementation decisions** — from this run's context (plan from step-02, examine/resolve findings from step-05/06, execution notes) and the actual diff (`git diff {base_branch}...HEAD`, or the working tree when no branch). Keep only what deviates from or extends the original task/plan:
   - **Architecture** — libraries swapped, new patterns, structural moves, new endpoints/data models, boundaries that shifted, caching/perf/security decisions not planned.
   - **UX** (UI work only) — flows, screens, components, states or interactions that changed vs the spec.
   - **Product / scope** — features dropped, deferred, added, or reshaped; acceptance criteria that changed; new requirements that surfaced.
   - If there are **no material decisions** → note `Docs: no reconciliation needed` in the summary and continue to `## Process`.

2. **Locate target docs** (skip a dimension when its doc is absent — never create a doc that doesn't exist):
   - Architecture → `docs/architecture.md`
   - UX → `docs/ux.md`, `docs/ux-design.md`, or `docs/ux/*.md`
   - PRD → `docs/prd.md` or `docs/prd/*.md`

3. **Draft updates in parallel** — for each dimension that has BOTH a doc AND relevant decisions, spawn the owning agent in ONE message with **`run_in_background: false`** (they edit distinct files, so no conflict; never `git stash` / `git add .` — see [[feedback-git-parallel-agents]]). Reuse an agent that is still alive by addressing it by `name` via `SendMessage`; otherwise spawn fresh ones:
   - `team-architect` → architecture doc
   - `team-ux` → UX doc (UI work only)
   - `team-pm` → PRD
   - Each agent receives its decision list + the target file, and must produce a **surgical, minimal patch**: update only what changed, preserve the doc's voice / structure / frontmatter, record deferrals and drops explicitly instead of deleting silently. No rewrites.

4. **Confirm before persisting** (garde-fou — NEVER silent doc changes): present a consolidated summary of proposed doc changes (per file: which sections change and why). **MUST use `AskUserQuestion` regardless of `{auto_mode}` / `{pr_mode}`** — options: "Apply all" / "Apply selected" / "Skip doc updates".

5. **Apply & stage** — on approval, write the approved edits and stage the updated doc files so they land in the final commit (step 1 below). If skipped, note it in the final summary.

## Process

1. **Verify git status**:
   - Check for uncommitted changes — commit if needed, with explicit file paths
   - Check commits ahead of remote
   - No team teardown is required: there is no explicit Team API, and idle agents cost nothing

2. **Push** (if `{branch_mode}`):
   - If `{worktree_mode}`: commits were already pushed after each modification — only push if `git status` shows commits ahead of remote. No confirmation needed.
   - Else:
     - Show commits to push
     - Ask confirmation (unless `{auto_mode}` or `{pr_mode}`) — **MUST use `AskUserQuestion`**
     - `git push -u origin {branch_name}`

3. **Create PR** (if `{pr_mode}`):
   - Title: `✨ {task_description}` — when the plan was split at step-02, scope the title to `{current_slice}` and suffix it with ` (1/N)`
   - Body: summary of changes, files modified, testing done. If `{deferred_slices}` is non-empty, add a `## Follow-up PRs` section listing them in order so the reviewer knows what is intentionally out of scope.
   - Use `gh pr create`

4. **Save final output** (if `{save_mode}`)

5. **Final summary**:
   ```
   🏁 APEX Complete: {task_id}

   ✓ Analyzed    ✓ Planned    ✓ Executed
   ✓ Validated   [✓ Examined] [✓ Tested]

   Branch: {branch_name}
   PR: {pr_url}
   Commits: N
   Files changed: N

   [Follow-up PRs (plan split at step-02):
    2. {slice title} — {scope}
    3. {slice title} — {scope}
    → relaunch `/apex` on the next slice]
   ```

## Completion Condition
When this step is complete, stop the workflow and report the final outcome to the user.
