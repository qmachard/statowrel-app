---
name: step-02-validate
description: Validate implementation — lint, typecheck, commit, optional PR
prev_step: steps/step-01-code.md
---

# Step 2: Validate & Finish

## MANDATORY EXECUTION RULES:

- 🛑 NEVER claim checks pass when they don't
- ✅ ALWAYS run available validation commands
- ✅ ALWAYS fix only what you broke — don't fix pre-existing issues
- ✅ ALWAYS commit if branch_mode is true
- 📋 YOU ARE A VALIDATOR — verify and ship

## YOUR TASK:

Validate the implementation, fix issues, commit, and optionally create a PR.

---

## EXECUTION SEQUENCE:

### 1. Discover Available Commands

```bash
cat package.json 2>/dev/null | grep -A 20 '"scripts"' || echo "No package.json"
```

Look for: `typecheck`, `lint`, `build`, `format`, `check`.

### 2. Run Validation

Run whatever is available, in order:

**2.1 Typecheck** (if available)
```bash
npm run typecheck  # or pnpm/yarn
```

If fails → fix only what you broke → re-run.

**2.2 Lint** (if available)
```bash
npm run lint --fix  # or pnpm/yarn
```

If fails → fix only what you broke → re-run.

<critical>
Max 3 fix attempts per check. If still failing after 3 tries, report the issue and move on.
Do NOT fix pre-existing lint/type errors that are unrelated to your changes.
</critical>

### 2b. Reconcile Project Docs (only if the change materially touches them)

OneShot is deliberately minimal, so this runs **only when project docs exist AND this change actually deviates from or extends them**. Otherwise skip silently.

1. **Check for a material decision** — did this task swap a library, add a pattern/endpoint/data model, change a user flow/screen/component, or drop/add/reshape product scope? If not → skip, note nothing.
2. **Locate docs** (skip a dimension whose doc is absent — never create one):
   - Architecture → `docs/architecture.md`
   - UX → `docs/ux.md`, `docs/ux-design.md`, or `docs/ux/*.md`
   - PRD → `docs/prd.md` or `docs/prd/*.md`
3. **Draft surgical updates** — for each affected dimension that has a doc, spawn the owning agent in parallel (distinct files, no conflict; never `git stash` / `git add .` — see [[feedback-git-parallel-agents]]):
   - `team-architect` → architecture doc · `team-ux` → UX doc (UI work) · `team-pm` → PRD
   - Each produces a **minimal patch** (only what changed; preserve voice/structure/frontmatter; record drops/deferrals explicitly — no rewrites).
   - This is the one exception to OneShot's "no subagents" rule; keep it to the affected doc(s) only.
4. **Confirm before persisting** (garde-fou — NEVER silent doc changes): present the proposed changes and **MUST use `AskUserQuestion`** — "Apply" / "Skip". On Apply, write the edits and include the doc files in the commit below.

### 3. Commit (if branch_mode)

**If `{branch_mode}` = true:**

Stage and commit only the files you changed (never `git add .` / `-A`):

```bash
git add <specific-files>
git commit -m "<gitmoji> <Short description of what was done>"
```

### 3b. Push (if worktree_mode)

**If `{worktree_mode}` = true:**

Push immediately so the user can review locally. No confirmation needed — the user opted in via `-w`.

```bash
git push -u origin {branch_name}   # first push sets upstream
# subsequent pushes: git push
```

### 4. Create PR (if pr_mode)

**If `{pr_mode}` = true:**

The `-pr` flag is an explicit opt-in — push and create the PR directly, NO confirmation. The branch is already guaranteed non-`main`/`master` (verified at init step-00, section 3).

```bash
# If worktree_mode pushed already, this is a no-op or sets upstream once
git push -u origin {branch_name}
gh pr create --title "<short title>" --body "$(cat <<'EOF'
## Summary
- <what was done>

## Test plan
- [ ] Lint passes
- [ ] Typecheck passes
EOF
)"
```

### 5. Output Summary

```
## Done

**Task:** {task_description}
**Files changed:** {list of files}
**Validation:** {✓ lint | ✗ lint} {✓ typecheck | ✗ typecheck}
{**Branch:** {branch_name} — if branch_mode}
{**PR:** {pr_url} — if pr_mode}
```

---

## WORKFLOW COMPLETE

This is the final step. Do not load any more steps.

## Completion Condition
When this step is complete, stop the workflow and report the final outcome to the user.
