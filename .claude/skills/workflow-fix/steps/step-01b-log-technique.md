# Step 01b — Log Technique

Add strategic debug logs when error cannot be reproduced directly.

## When Triggered
- Cannot reproduce locally
- Bug only in user's environment
- Intermittent/timing-sensitive error
- Need runtime visibility

## Rules
- NEVER propose solutions — only add logs
- NEVER fix bugs in this step
- NEVER log sensitive data (passwords, tokens, API keys, PII, credit cards, session IDs)
- ALL debug logs MUST be removed later in step-04 or step-05

## Log Prefixes

| Prefix | Purpose |
|--------|---------|
| `[DEBUG:entry]` | Function entry with args |
| `[DEBUG:exit]` | Function exit with return value |
| `[DEBUG:decision]` | Conditional evaluation |
| `[DEBUG:branch]` | Which branch taken |
| `[DEBUG:transform]` | Before/after data changes |
| `[DEBUG:async]` | Async operations with timing |
| `[DEBUG:error]` | Error details |
| `[DEBUG:state]` | State snapshots |

## Process

1. **Identify log placement**: Entry points, decision points, data transformations, exit points
2. **Add debug logs**: Use prefixes above, track each log in a table:
   ```
   | File | Line | Prefix | Purpose |
   |------|------|--------|---------|
   ```
3. **Security check**: Verify NO sensitive data is logged
4. **Ask user to run** — **MUST use `AskUserQuestion`**: Present log summary, ask user to run app and share console output
5. **Analyze output**: Parse `[DEBUG:xxx]` lines, check execution order, identify unexpected values
6. **Decide next**: Proceed to solutions, add more logs, or try different area
7. **Track for cleanup**: Store all logs in `{debug_logs}` for removal later

## Completion Condition
When this step is complete, immediately load and execute `step-02-find-solutions.md`. Do not stop between this step and the next step.

## Next
Load `step-02-find-solutions.md`
