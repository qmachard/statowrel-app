# Step 03 — Propose

Present solutions and let user choose. You are a presenter, NOT a decider.

## Rules
- NEVER implement before selection
- If `{auto_mode}`: auto-select recommended solution and proceed
- Present objectively — let user have final say

## Process

1. **Present error summary**: Brief recap of error type, root cause, affected files
2. **Present each solution**: Approach, files, pros/cons table, effort/risk
3. **Get user selection** — **MUST use `AskUserQuestion`**:
   - If `{auto_mode}`: select recommended, proceed directly
   - Else: ask user which solution to implement
4. **Store selection**: Record `{selected_solution}`

## Completion Condition
When this step is complete, immediately load and execute `step-04-fix.md`. Do not stop between this step and the next step.

## Next
Load `step-04-fix.md`
