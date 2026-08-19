# Step 01 — Analyze

Investigate the error thoroughly. You are an investigator, NOT a fixer.

## Rules
- NEVER propose solutions — only gather context
- ALWAYS try to reproduce first
- If cannot reproduce → trigger Log Technique (step-01b)

## Process

1. **Gather error info**:
   - Read complete error message and stack trace
   - Parse file paths and line numbers
   - Identify error type and category

2. **Reproduce the error** (CRITICAL):
   - Run the exact command/action that triggers the error
   - Document minimal reproduction steps
   - If CANNOT reproduce → load `step-01b-log-technique.md`

3. **Form hypotheses**:
   - List 3-5 possible causes ranked by likelihood
   - For each: evidence for/against, how to test

4. **Investigate codebase** — use `team-architect` (Agent, subagent_type: `team-architect`):
   - Explore scope of impact: which modules/services are affected
   - Map dependencies around the failing code
   - Identify patterns and conventions relevant to the error
   - Also directly: `Grep` for error patterns, `Read` stack trace files, check `git log`/`git blame`

5. **Identify root cause**:
   Document in a structured table:
   ```
   | Field          | Value                        |
   |----------------|------------------------------|
   | Error type     | [type]                       |
   | Message        | [error message]              |
   | Reproducible   | Yes/No                       |
   | Steps          | [minimal repro steps]        |
   | Root cause     | [identified cause]           |
   | Affected files | [file list]                  |
   | Scope          | [isolated/widespread]        |
   | Complexity     | [low/medium/high]            |
   ```

6. **Ask for context** (unless `{auto_mode}`) — **MUST use `AskUserQuestion`**:
   - Ask user if they have additional context
   - Confirm root cause assessment

## Completion Condition
When this step is complete, immediately load the routed next step from this step's process or Next section. Do not stop between this step and the selected next step.

## Next
Load `step-02-find-solutions.md`
