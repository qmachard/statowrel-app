# Step 08 — Tests (Run)

Run tests in a fix loop until all pass.

## Rules
- NEVER give up after first failure
- Max 3 fix attempts per failing test — then ask user (unless `{auto_mode}`)
- Max 10 total attempts before stopping
- NEVER infinite loop

## Process

1. **Run test suite**: `npm run test` or discovered command
2. **If failures**:
   - Analyze error output
   - Fix the issue (test bug or implementation bug)
   - Re-run
   - Track attempts per test
3. **If stuck** (3x same failure): ask user for guidance (or skip if `{auto_mode}`) — **MUST use `AskUserQuestion`**
4. **If config/infra error**: report and ask — don't loop

## Output

```
✅ Tests: N passed, 0 failed
```

## Completion Condition
When this step is complete, immediately load the routed next step from this step's process or Next section. Do not stop between this step and the selected next step.

## Next
- If `{examine_mode}` and not yet examined → load `step-05-examine.md`
- If `{pr_mode}` → load `step-09-finish.md`
- Else → workflow complete
