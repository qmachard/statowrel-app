# Step 05 — Verify

Prove the fix works through multi-layer verification. You are a skeptic — assume broken until proven.

## Rules
- NEVER declare success without RUNTIME verification (Layer 3)
- NEVER trust green tests alone (~20-40% still fail in production)
- Run the layers in order; 3b, 5 and 6 are conditional, the rest are mandatory
- Report each layer as one status line — no narration between them

## Verification Pyramid

### Layer 1 — Static Analysis
- Run syntax check: `node --check` (JS) or `python -m py_compile` (Python)
- Verify imports, typos, basic correctness
- **Fails** → fix and retry Layer 1

### Layer 2 — Automated Checks
- Run build: `npm run build`
- Run typecheck: `npm run typecheck` / `tsc --noEmit`
- Run lint: `npm run lint`
- Run tests: `npm run test`
- Document each result
- **Fails** → fix issue, return to Layer 1

### Layer 3 — Runtime Execution (CRITICAL)
Execute the ACTUAL code path that triggered the original error:

| Error Type | How to Verify |
|-----------|---------------|
| Frontend | Open in browser, trigger the action |
| Backend/API | Call endpoint with curl |
| CLI | Run the command |
| Server | Start server, trigger the path |

Document:
```
| Check              | Result |
|--------------------|--------|
| Method used        | [how]  |
| Original error     | Gone ✓/Still present ✗ |
| New errors         | None ✓/[describe] |
| Actual behavior    | [what happens] |
| Expected behavior  | [what should happen] |
| Passed             | Yes ✓/No ✗ |
```

- **Fails** → return to step-03 or step-04

### Layer 3b — Adversarial Review (only if `{review_mode}`)
Without `-r`, skip this layer entirely — layer 3 already proved the fix at runtime.

With `-r`, launch `code-reviewer` (Agent, subagent_type: `code-reviewer`, **`run_in_background: false`**) to review the fix:
- Focus: does the fix introduce new bugs, security issues, or regressions?
- Check: is the fix minimal and focused, or does it have side effects?
- If findings with severity CRITICAL/HIGH → fix before proceeding

### Layer 4 — Regression & User Confirmation
- Run full test suite
- Check for regressions
- If not `{auto_mode}` → ask user to confirm fix works — **MUST use `AskUserQuestion`**

### Layer 5 — Reconcile Project Docs (only if the fix changes documented behavior)

Most fixes leave the docs untouched — run this **only when the root cause or fix reveals a decision the docs claim otherwise**: a documented architecture pattern/contract that was wrong or now changed, a documented user flow/behavior that shifted, or a documented requirement/AC that was invalid.

1. **Material change?** If the fix is purely internal (no documented behavior/decision affected) → skip silently.
2. **Locate docs** (skip a dimension whose doc is absent — never create one): Architecture → `docs/architecture.md` · UX → `docs/ux.md` / `docs/ux-design.md` / `docs/ux/*.md` · PRD → `docs/prd.md` / `docs/prd/*.md`.
3. **Draft surgical updates** — spawn the owning agent for each affected doc in parallel (distinct files, no conflict; never `git stash` / `git add .` — see [[feedback-git-parallel-agents]]): `team-architect` → architecture · `team-ux` → UX (UI fixes) · `team-pm` → PRD. Each produces a **minimal patch** (only what changed; preserve voice/structure/frontmatter — no rewrites).
4. **Confirm before persisting** (garde-fou — NEVER silent doc changes): present the proposed changes and **MUST use `AskUserQuestion` regardless of `{auto_mode}`** — "Apply" / "Skip". On Apply, write the edits (and stage the doc files if the fix is being committed).

### Layer 6 — Commit & Push (worktree mode only)
If `{worktree_mode}` and all previous layers passed:
- Stage only the files in `{files_modified}` (never `git add .` / `-A`)
- Commit with gitmoji format: `git commit -m "🐛 <short description of the fix>"`
- Push so the user can review locally: `git push -u origin {branch_name}` (first push) then `git push` for follow-ups
- No confirmation needed — the user opted in via `-w`

## Output

```
🔧 Fix verified

| Layer | Status |
|-------|--------|
| 1. Static analysis | ✓ |
| 2. Automated checks | ✓ |
| 3. Runtime execution | ✓ |
| 4. Regression check | ✓ |

Files modified:
- path/file.ts — [what changed]

Root cause: [summary]
Fix: [summary]
```

## Completion Condition
When this step is complete, stop the workflow and report the final outcome to the user.

## Workflow Complete
If all layers passed → report success. If failed → offer paths forward.
