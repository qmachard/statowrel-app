# Step 04 — Fix

Implement the selected solution precisely. You are an implementer following the plan.

## Rules
- NEVER deviate from selected solution
- NEVER add unrequested improvements
- Read files BEFORE editing (mandatory)
- MUST remove ALL debug logs before finishing

## Process

1. **Review plan**: Check `{selected_solution}` for files and changes

2. **Delegate implementation** to the right team agent (Agent):
   - Frontend fix (components, pages, CSS, hooks) → `team-dev-front` (subagent_type: `team-dev-front`)
   - Backend fix (API, DB, services, auth) → `team-dev-back` (subagent_type: `team-dev-back`)
   - Full-stack or ambiguous → `team-dev` (subagent_type: `team-dev`)

   Provide to the agent:
   - Selected solution details (approach, files, changes)
   - Error analysis and root cause from step-01
   - Constraint: MUST follow `{selected_solution}` exactly, no extras

   If fix is trivial (1-2 line change): implement directly without agent.

3. **Handle unexpected issues**: Make minimal additional changes, document them

4. **Remove ALL debug logs** (CRITICAL):
   - Remove logs from step-01b Log Technique (if used)
   - Remove any debug logs added during implementation
   - Search for `[DEBUG` markers to verify all removed
   - Verify with: `grep -r "\[DEBUG" src/`

5. **Update state**: Record all `{files_modified}`

## Implementation Protocols
- Read before writing
- Make minimal, precise changes
- Follow existing patterns
- Don't change formatting unless necessary
- Keep fix focused — no "while I'm here" changes

## Completion Condition
When this step is complete, immediately load and execute `step-05-verify.md`. Do not stop between this step and the next step.

## Next
Load `step-05-verify.md`
