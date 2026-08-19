# Step 03 — Execute (Orchestrated)

Drive parallel task execution with the `Workflow` tool. You are the orchestrator — NEVER implement code yourself.

## Rules
- NEVER write implementation code yourself — delegate to the workflow's agents
- `{teams_mode}` (the `--teams` flag) IS the user's explicit opt-in to `Workflow` — do not reach this step otherwise
- The workflow implements and reports; **YOU** own every git write (see Commit & Push below)
- No `AskUserQuestion` inside a workflow — agents cannot reach the user. The last gate was step-02b
- Never pass `mode` / `bypassPermissions` to an agent — subagents inherit the session's permission mode

## Agent Selection

Map each task to the right specialist via `agentType`:

| Task Type | subagent_type |
|-----------|---------------|
| Frontend (components, pages, CSS, hooks) | `team-dev-front` |
| Backend (API, DB, services, auth) | `team-dev-back` |
| Full-stack or ambiguous | `team-dev` |

## Process

1. **Group tasks by dependency level** from step-02b — level N may only start once level N-1 is on disk.
2. **Build the `args` payload**: `{ levels: [[task, ...], ...], context: "<analysis excerpt from step-01>" }`. Each task carries `id`, `title`, `objective`, `files`, `criteria`, `agent`.
3. **Launch the workflow** with the script below. Pass the payload as a real JSON value in `args` — never a JSON-encoded string.
4. **Wait for the completion notification.** The tool returns a run ID immediately; the results arrive later. Do NOT load step-04 before the notification lands.
5. **Read the returned results** — one entry per task with its files, summary and verdict.
6. **Commit & Push** — see below.
7. **Sync task state**: `TaskUpdate` each completed task to `completed`; leave anything the verdict flagged as `in_progress` and report it.

### Sizing
- 1-2 tasks → skip the workflow entirely, use `Agent` with `run_in_background: false`
- 3+ tasks → workflow, max 5 concurrent implementers per level
- Keep the whole run under 15 agents unless the user asked for a bigger sweep

## Workflow Script

```js
export const meta = {
  name: 'apex-execute',
  description: 'Implement APEX tasks level by level, verifying each one as it lands',
  phases: [
    { title: 'Implement', detail: 'one agent per task, parallel within a dependency level' },
    { title: 'Verify', detail: 'file-boundary and acceptance-criteria check per task' },
  ],
}

const IMPL = {
  type: 'object',
  required: ['taskId', 'files', 'summary', 'status'],
  properties: {
    taskId: { type: 'string' },
    files: { type: 'array', items: { type: 'string' }, description: 'repo-relative paths actually written' },
    summary: { type: 'string' },
    status: { enum: ['done', 'partial', 'blocked'] },
    notes: { type: 'string', description: 'deviations from the plan, if any' },
  },
}

const VERDICT = {
  type: 'object',
  required: ['taskId', 'criteriaMet', 'boundaryRespected'],
  properties: {
    taskId: { type: 'string' },
    criteriaMet: { type: 'boolean' },
    boundaryRespected: { type: 'boolean', description: 'no file outside the task file list was touched' },
    gaps: { type: 'array', items: { type: 'string' } },
  },
}

const implPrompt = (t, context) => `Implement this APEX task. Do NOT commit, stage, or stash anything — the orchestrator owns git.

## Task ${t.id}: ${t.title}
${t.objective}

## Files you may touch (hard boundary)
${t.files.join('\n')}

## Acceptance criteria
${t.criteria.join('\n')}

## Project context
${context}

Read before writing. Follow the existing conventions exactly. Add no feature that is not in the objective.`

const verifyPrompt = (t, impl) => `Verify APEX task ${t.id} against its spec. Read the files on disk — do not trust the report.

Allowed files: ${t.files.join(', ')}
Reported files: ${(impl?.files || []).join(', ')}
Acceptance criteria:
${t.criteria.join('\n')}

Report whether every criterion is genuinely met and whether any file outside the allowed list was modified.`

const levels = args.levels
const results = []

for (let i = 0; i < levels.length; i++) {
  log(`Level ${i + 1}/${levels.length} — ${levels[i].length} task(s)`)
  const done = await pipeline(
    levels[i],
    t => agent(implPrompt(t, args.context), {
      label: `impl:${t.id}`, phase: 'Implement', agentType: t.agent, schema: IMPL,
    }),
    (impl, t) => agent(verifyPrompt(t, impl), {
      label: `verify:${t.id}`, phase: 'Verify', schema: VERDICT, effort: 'low',
    }).then(verdict => ({ taskId: t.id, files: impl?.files || [], impl, verdict })),
  )
  results.push(...done.filter(Boolean))
}

return results
```

Adjust freely — drop the verify stage for trivial tasks, add `model` per agent when the default tier is wrong for the task. Keep the barrier between levels: it is what enforces the dependency graph.

## Commit & Push (orchestrator only)

Agents never touch git. Once the workflow returns, walk the results **in dependency order**:

1. `git add <files from that task's result>` — explicit paths only, never `git add .` / `-A`, never `git stash`
2. `git commit -m "<gitmoji> <task title>"`
3. If `{worktree_mode}`: `git push -u origin {branch_name}` on the first push, then plain `git push`. No confirmation — the user opted in via `-w`.

If `{branch_mode}` without `-w`, commit per task and leave the push to step-09.

## Completion Condition
When this step is complete, immediately load and execute `step-04-validate.md`. Do not stop between this step and the next step.

## Next
Load `step-04-validate.md`
