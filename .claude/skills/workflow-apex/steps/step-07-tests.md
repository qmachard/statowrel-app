# Step 07 — Tests (Create)

Analyze existing test patterns and create appropriate tests.

## Rules
- NEVER create tests without analyzing existing patterns first
- Follow existing test conventions EXACTLY
- Economy mode: read 1 similar test, create minimal essential tests only

## Process

1. **Discover**: framework, config, test commands, test directory structure
2. **Analyze patterns**: read 1-3 existing test files similar to your changes
3. **Determine test strategy** based on what was implemented:
   - API routes → integration tests
   - Utilities/services → unit tests
   - React components → component tests (Testing Library)
   - Full features → integration + E2E
4. **Create test plan** — present to user (unless `{auto_mode}`) — **MUST use `AskUserQuestion`**
5. **Write tests** following discovered patterns exactly
6. **Verify syntax** — ensure tests at least parse correctly

## Completion Condition
When this step is complete, immediately load and execute `step-08-run-tests.md`. Do not stop between this step and the next step.

## Next
Load `step-08-run-tests.md`
