# Step 01 — Analyze

Pure context gathering. Discover WHAT EXISTS — never plan, never decide HOW.

## Rules
- ONLY gather information — no planning, no todos, no implementation decisions
- Assess task complexity (1-10) BEFORE deciding how many agents to launch
- Economy mode: use direct Glob/Grep/Read instead of agents
- Every agent below **MUST be spawned with `run_in_background: false`** — step-02 cannot plan without their findings

## Process

### Normal Mode
Launch agents in parallel — all in ONE message, each with `run_in_background: false`:

1. **`team-architect`** (Agent, subagent_type: `team-architect`)
   - Explore project structure, tech stack, conventions
   - Map module boundaries and dependencies
   - Identify patterns relevant to the task

2. **`explore-docs`** (Agent, subagent_type: `explore-docs`) — if external libraries involved
   - Fetch up-to-date docs for libraries involved

3. **`websearch`** (Agent, subagent_type: `websearch`) — if novel patterns or unknown APIs
   - Research best practices for specific technical questions

### Economy Mode (⚡)
Direct exploration — no agents:
- `Glob` for project structure
- `Grep` for patterns, imports, conventions
- `Read` key files (configs, entry points, related modules)

## Output

```
📊 Analysis complete

Related files:
- path/file.ts:L42 — [relevance]

Patterns observed:
- [convention or pattern found]

Acceptance criteria (inferred):
- [ ] AC1
- [ ] AC2
```

## Completion Condition
When this step is complete, immediately load and execute `step-02-plan.md`. Do not stop between this step and the next step.

## Next
Proceed to `step-02-plan.md` directly (no confirmation needed).
