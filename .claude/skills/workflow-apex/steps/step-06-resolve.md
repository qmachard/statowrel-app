# Step 06 — Resolve

Address review findings from the examination.

## Rules
- NEVER auto-fix Noise/Uncertain findings
- Always validate after fixes (typecheck + lint MUST pass)
- Provide clear completion summary

## Process

1. **Present resolution options** (unless `{auto_mode}`) — **MUST use `AskUserQuestion`**:
   - Auto-fix all Real findings
   - Walk through each finding interactively
   - Critical only
   - Skip all

2. **Apply fixes** based on chosen option:
   - For each finding: read file → apply fix → verify
   - Mark finding as resolved

3. **Post-resolution validation**:
   - Typecheck MUST pass
   - Lint MUST pass
   - Re-run tests if any were affected

4. **Resolution summary**:
   ```
   ✅ Resolved: N findings
   ⏭️ Skipped: N findings (Noise/Uncertain)
   ```

## Completion Condition
When this step is complete, immediately load the routed next step from this step's process or Next section. Do not stop between this step and the selected next step.

## Next
- If `{test_mode}` and tests not yet done → load `step-07-tests.md`
- If `{pr_mode}` → load `step-09-finish.md`
- Else → workflow complete
