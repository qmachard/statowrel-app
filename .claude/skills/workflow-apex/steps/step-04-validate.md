# Step 04 — Validate

Run the checks the project actually has, then check the acceptance criteria.

## Rules
- NEVER claim checks pass when they don't
- Always run typecheck/lint/tests
- Fix failures before proceeding
- Report the outcome as a short status list — no commentary around it

## Process

1. **Discover commands**: check package.json for available scripts
2. **Run validation suite** (in order):
   - Typecheck: `npm run typecheck` / `tsc --noEmit`
   - Lint: `npm run lint`
   - Existing tests: `npm run test`
3. **Fix failures** on code YOU changed — report failures on unrelated code
4. **Scan the diff once** for: unplanned files touched, unmet AC, leftover TODO/FIXME or debug statements
5. **Second opinion with `team-pm`** — **only if `{examine_mode}`** (Agent, subagent_type: `team-pm`, **`run_in_background: false`**), and never in economy mode: checks the acceptance criteria against the code and flags spec/implementation gaps. Without `-x`, step 4 is the validation — do not spawn an agent to redo it.
6. **Format code** if formatter available
7. **Present results** — status list only, one line per check

## Critical
- If `{teams_mode}`: the execution workflow has already returned — its per-task verdicts are input here, not a substitute for running the real validation suite

## Completion Condition
When this step is complete, immediately follow the decision tree below and load the selected next step. Do not stop between this step and the selected next step.

## Next Decision Tree
- If `{test_mode}` → load `step-07-tests.md`
- If `{examine_mode}` → load `step-05-examine.md`
- If not `{auto_mode}` → ask user what to do next — **MUST use `AskUserQuestion`**
- Else → load `step-09-finish.md` (if `{pr_mode}`) or complete
