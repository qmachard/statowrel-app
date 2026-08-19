# Step 05 — Examine (Adversarial Review)

Independent code review — security, logic, quality.

**Reached only when `{examine_mode}` is true** (`-x` / `--examine`). The flag is the user asking for a second pass; nothing here runs by default.

## Rules
- NEVER skip the security dimension once this step runs
- NEVER dismiss findings without justification
- Review the DIFF, not the whole codebase: `git diff {base_branch}...HEAD`, or the working tree when there is no branch
- Report findings in the table below — one row each, no essay per finding

## Mode Selection

| Mode | How |
|------|-----|
| `{economy_mode}` | Self-review checklist — no agents |
| `{teams_mode}` | `Workflow` — parallel review dimensions, then adversarial verification of each finding |
| Default | `Agent` fan-out, all in ONE message, each with **`run_in_background: false`** |

### Review Dimensions
1. **Security** — OWASP top 10, injection, input validation, auth/authz, secrets
2. **Logic** — race conditions, null handling, boundary conditions, error paths
3. **Clean code** — naming, duplication, readability, existing patterns
4. **Framework** (conditional, if React/Next.js detected) — SSR/CSR, hooks rules, performance

### Default Mode
One `code-reviewer` agent per dimension (Agent, subagent_type: `code-reviewer`), spawned in a single message with `run_in_background: false`. Each receives the diff scope and its focus. Findings come back raw — you classify them yourself using the table below.

### Teams Mode — Workflow

The `--teams` flag is the user's explicit opt-in to `Workflow`. Each dimension's findings get verified as soon as that dimension finishes — no barrier.

```js
export const meta = {
  name: 'apex-examine',
  description: 'Review the APEX diff across dimensions and adversarially verify each finding',
  phases: [
    { title: 'Review', detail: 'one reviewer per dimension' },
    { title: 'Verify', detail: 'refute each finding independently' },
  ],
}

const FINDINGS = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'file', 'line', 'finding'],
        properties: {
          severity: { enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          file: { type: 'string' },
          line: { type: 'integer' },
          finding: { type: 'string' },
          failureScenario: { type: 'string', description: 'concrete inputs/state -> wrong output' },
        },
      },
    },
  },
}

const VERDICT = {
  type: 'object',
  required: ['refuted', 'reason'],
  properties: {
    refuted: { type: 'boolean' },
    reason: { type: 'string' },
  },
}

const results = await pipeline(
  args.dimensions,
  d => agent(
    `Review this diff for ${d.focus}. Scope: ${args.scope}. Report only defects you can anchor to a file and line, each with a concrete failure scenario.`,
    { label: `review:${d.key}`, phase: 'Review', agentType: 'code-reviewer', schema: FINDINGS },
  ),
  review => parallel((review?.findings || []).map(f => () =>
    agent(
      `Try to REFUTE this review finding by reading the code at ${f.file}:${f.line}. Claim: ${f.finding}. Scenario: ${f.failureScenario || 'n/a'}. Default to refuted=true if you cannot reproduce the failure.`,
      { label: `verify:${f.file}:${f.line}`, phase: 'Verify', schema: VERDICT, effort: 'high' },
    ).then(v => ({ ...f, validity: v?.refuted === false ? 'Real' : 'Noise', reason: v?.reason })),
  )),
)

return results.flat().filter(Boolean)
```

Launch it, then **wait for the completion notification** before classifying — the tool returns a run ID immediately, not the findings.

### Economy Mode (⚡)
Self-review checklist — no agents:
- [ ] No SQL/command injection
- [ ] All inputs validated
- [ ] Auth checks in place
- [ ] No race conditions
- [ ] Error handling complete
- [ ] No hardcoded secrets

## Output

Classify findings:

| # | Severity | Validity | File:Line | Finding |
|---|----------|----------|-----------|---------|
| 1 | CRITICAL/HIGH/MEDIUM/LOW | Real/Noise/Uncertain | path:L42 | Description |

In teams mode, `Validity` comes from the verification stage — a finding a verifier could not refute is `Real`.

## Completion Condition
When this step is complete, immediately load and execute `step-06-resolve.md`. Do not stop between this step and the next step.

## Next
- If findings with Real validity → ask user: fix all, walk through, critical only, or skip — **MUST use `AskUserQuestion`**
- If chosen to fix → load `step-06-resolve.md`
- If no findings or skip → continue to next step (tests or finish)
