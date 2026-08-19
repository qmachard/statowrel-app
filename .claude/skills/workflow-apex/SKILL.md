---
name: apex
description: Systematic implementation using APEX methodology (Analyze-Plan-Execute-eXamine) with team agents and an opt-in adversarial review pass
---

# APEX Workflow

Systematic implementation framework using team agents for high-quality, tracked development.

## Interactive Stops (CRITICAL — overrides permission mode)

When `{auto_mode}` is **false**, every confirmation, clarification, or choice point in this workflow **MUST** be performed by calling the `AskUserQuestion` tool — never as plain text expecting a reply, never as a "let me know" sentence, never as a presented summary followed by silence.

- `AskUserQuestion` forces a real stop and waits for the user input, **even when permission mode is `bypassPermissions`**. Plain text prompts do NOT stop in bypass mode — Claude will silently continue.
- This rule applies to every step instruction containing: "ask user", "ask the user", "present and ask", "present (unless `{auto_mode}`)", "wait for confirmation", "wait for user confirmation", "clarify ambiguities", "confirm with user", "choose between options", validation gates, branch/PR/commit/push confirmations, destructive operations, edit/overwrite confirmations.
- In `{auto_mode}` (when true): skip the question and apply the documented default — do not call `AskUserQuestion`.
- Garde-fous marked "NEVER" (push, overwrite, auto-commit, silent doc changes) MUST use `AskUserQuestion` regardless of `{auto_mode}` value.
- **Exception — `{pr_mode}`**: the `-p`/`--pr` flag is itself an explicit authorization to push and open a PR. When `{pr_mode}` is true, do NOT ask before pushing or creating the PR — push and create the PR directly (the branch is already guaranteed non-`main`/`master`, verified at init step-00b). The other garde-fous (overwrite, auto-commit of unrelated changes, silent doc changes) still apply.

## Output Language (CRITICAL)

Everything the user reads is written in **French**: step summaries, plans and analyses presented in chat, `AskUserQuestion` questions and options, validation and review reports, blocker messages, final recap. Use correct French with every accent (é, è, ê, à, ç, ô, î, ï, ù, û).

The output blocks printed in this file and in `steps/*.md` are English templates — render them in French, keeping their structure, emoji, and variable names.

Everything else stays in English: code, comments, identifiers, file and branch names, commit messages, PR titles and descriptions, saved output files (`templates/*.md`), and agent-to-agent prompts. Team agents are instructed in English; their findings are reported back to the user in French.

## Concision (CRITICAL)

Default to the shortest output that does the job. Length is not proof of effort.

- **Answers** — lead with the result. Summarize; go into detail only when the user asks for it.
- **Scope** — do exactly what was asked. No adjacent refactor, no unrequested file, no "while I'm here" extra.
- **Code comments** — only for a non-obvious *why*. Never restate the line below.
- **Documentation** — patch the lines that changed. No new doc file unless asked, no rewrite of sections that still hold.
- **Commits & PRs** — one-line subject; a body only when the change genuinely needs one.
- **Step reports** — the output blocks in `steps/*.md` are already the short form. Render them as-is, without surrounding prose.
- **Agent prompts** — repeat this rule to every agent you spawn, and ask for the finding/result, not a write-up of how it got there.

## Review (`{examine_mode}`)

Re-reading your own work is **off by default** — write it right the first time. The `-x` flag is the user's explicit request for a second pass; without it, steps 05-06 never run and no `code-reviewer` is spawned.

## Context

- Git state: !`git status`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -5`

## Flags

Parse from user input (all default to `false` unless noted):

| Flag | Trigger | Description |
|------|---------|-------------|
| `auto_mode` | `-a`, `--auto` | Minimal confirmations, auto-approve steps |
| `examine_mode` | `-x`, `--examine` | Adversarial code review + resolve (steps 05-06) |
| `save_mode` | `-s`, `--save` | Save progress to output files |
| `test_mode` | `-t`, `--test` | Generate and run tests (steps 07-08) |
| `economy_mode` | `-e`, `--economy` | No subagents, direct tools only (~70% token savings) |
| `branch_mode` | `-b`, `--branch` | Create feature branch, commit per task |
| `pr_mode` | `-p`, `--pr` | Create PR at finish (implies `-b`) |
| `worktree_mode` | `-w`, `--worktree` | Require execution inside a git worktree; commit + push after each modification (implies `-b`) |
| `interactive_mode` | `-i`, `--interactive` | Interactive flag configuration menu |
| `tasks_mode` | `-k`, `--tasks` | Break plan into task files with dependencies |
| `teams_mode` | `--teams` | Deterministic multi-agent orchestration via the `Workflow` tool (implies `-k`) |

## Team Agents

| Agent | Role | Used in |
|-------|------|---------|
| `team-architect` | Analyzes codebase, designs architecture, validates readiness; reconciles `docs/architecture.md` with implementation decisions | Analyze, Plan, Finish |
| `team-pm` | Validates stories, checks acceptance criteria, course correction; reconciles PRD scope with implementation decisions | Plan, Validate, Finish |
| `team-ux` | Reconciles UX docs (flows, screens, components) with implementation decisions (UI work only) | Finish |
| `team-dev` | Implements stories/tasks with TDD discipline | Execute |
| `team-dev-front` | Frontend implementation (React, Next.js, CSS) | Execute |
| `team-dev-back` | Backend implementation (API, DB, services) | Execute |
| `code-reviewer` | Adversarial review (security, logic, quality) — only with `-x` | Examine |

## Agent Spawning Contract (CRITICAL)

Subagents spawned with the `Agent` tool run **in the background by default** — the call returns immediately and the result arrives later as a notification. Every APEX step that needs a subagent's result before continuing **MUST pass `run_in_background: false`**. This applies to step-01 (analyze), step-02/04 (`team-pm` validation), step-05 (reviewers, when not `{teams_mode}`) and step-09 (doc reconciliation). Forgetting it makes the workflow validate an empty diff and review code that does not exist yet.

There is no explicit Team API: `TeamCreate`, `TeamDelete` and per-call permission `mode` no longer exist. The session has a single implicit team; agents are addressed by `name` via `SendMessage`, and no shutdown ritual is required.

## Orchestration (`{teams_mode}`)

When `{teams_mode}` is true, parallel work is driven by the **`Workflow` tool** instead of hand-rolled `Agent` fan-out. The `--teams` flag is itself the explicit user opt-in that the `Workflow` tool requires — never call `Workflow` when `{teams_mode}` is false.

Contract for every workflow this skill launches:

- **No user interaction inside a workflow.** Workflow agents cannot call `AskUserQuestion`. Every confirmation, gate, or choice stays in the main step — before launching the workflow, or after it returns.
- **Workflows run in the background.** The tool returns a run ID immediately; the results arrive as a task notification. Do NOT advance to the next step before that notification lands.
- **No git writes inside a workflow.** Agents implement and report; the main step does the `git add` / `commit` / `push` with explicit file paths. Never `git add .` / `-A`, never `git stash` (see [[feedback-git-parallel-agents]]).
- **No worktree isolation by default.** APEX tasks own disjoint file sets by construction, so `isolation: 'worktree'` is unnecessary overhead. Use it only when two tasks provably touch the same file.
- **Keep it under 15 agents** unless the user asked for a larger sweep.
- Pass task data through `args` and force structured returns with `schema` — never ask an agent to emit parseable prose.

## State Variables

```
{task_description}    - User's original request
{feature_name}        - Kebab-case feature identifier
{task_id}             - Generated ID: NN-feature-name
{acceptance_criteria}  - Inferred or explicit AC
{current_slice}       - Plan slice implemented in this run (if the plan was split into several PRs)
{deferred_slices}     - Remaining slices, to ship as follow-up PRs
{output_dir}          - Save output path (if save_mode)
{branch_name}         - Git branch name (if branch_mode)
{auto_mode}           - Boolean
{examine_mode}        - Boolean
{save_mode}           - Boolean
{test_mode}           - Boolean
{economy_mode}        - Boolean
{branch_mode}         - Boolean
{pr_mode}             - Boolean
{worktree_mode}       - Boolean
{tasks_mode}          - Boolean
{teams_mode}          - Boolean
```

## Workflow

```
step-00-init → step-01-analyze → step-02-plan → [step-02b-tasks]
  → step-03-execute / step-03-execute-teams
  → step-04-validate → [step-05-examine → step-06-resolve]
  → [step-07-tests → step-08-run-tests]
  → step-09-finish (reconcile PRD / architecture / UX docs, then commit)
```

## Entry Point

**Complete ALL steps in sequence. User feedback is applied within the current step, then continue to the next. NEVER exit early.**

Load and execute `steps/step-00-init.md`
