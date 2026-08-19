---
name: fix
description: Systematic bug fixing workflow — analyze, research solutions, implement fix, verify with runtime execution. Emphasizes reproducing before fixing and multi-layer verification.
---

# Fix — Bug Fixing Workflow

Systematic debugging and fix workflow. Reproduce first, research solutions, implement precisely, verify at runtime.

## Interactive Stops (CRITICAL — overrides permission mode)

When `{auto_mode}` is **false**, every confirmation, clarification, or choice point in this workflow **MUST** be performed by calling the `AskUserQuestion` tool — never as plain text expecting a reply, never as a "let me know" sentence, never as a presented summary followed by silence.

- `AskUserQuestion` forces a real stop and waits for the user input, **even when permission mode is `bypassPermissions`**. Plain text prompts do NOT stop in bypass mode — Claude will silently continue.
- This rule applies to every step instruction containing: "ask user", "ask the user", "present and ask", "present (unless `{auto_mode}`)", "wait for confirmation", "wait for user confirmation", "clarify ambiguities", "confirm with user", "choose between options", validation gates, branch/PR/commit/push confirmations, destructive operations, edit/overwrite confirmations.
- In `{auto_mode}` (when true): skip the question and apply the documented default — do not call `AskUserQuestion`.
- Garde-fous marked "NEVER" (push, overwrite, auto-commit, silent doc changes) MUST use `AskUserQuestion` regardless of `{auto_mode}` value.

## Output Language (CRITICAL)

Everything the user reads is written in **French**: step summaries, analysis and solution presentations, `AskUserQuestion` questions and options, verification reports, blocker messages, final recap. Use correct French with every accent (é, è, ê, à, ç, ô, î, ï, ù, û).

The output blocks printed in this file and in `steps/*.md` are English templates — render them in French, keeping their structure, emoji, and variable names.

Everything else stays in English: code, comments, identifiers, debug logs, file and branch names, commit messages, PR titles and descriptions, generated documents, and agent-to-agent prompts.

## Concision (CRITICAL)

Default to the shortest output that does the job. Length is not proof of effort.

- **Answers** — root cause, then fix, in a couple of lines. The full investigation trail only if the user asks for it.
- **Scope** — fix the reported bug, nothing else. Adjacent problems get reported, not fixed.
- **Code comments** — only for a non-obvious *why*. Never restate the line below.
- **Documentation** — patch the lines that changed. No new doc file unless asked.
- **Commits & PRs** — one-line subject; a body only when the fix genuinely needs one.
- **Step reports** — the output blocks in `steps/*.md` are already the short form. Render them as-is, without surrounding prose.
- **Agent prompts** — repeat this rule to every agent you spawn, and ask for the finding/result, not a write-up of how it got there.

## Review (`{review_mode}`)

Re-reading your own fix is **off by default** — layer 3 (runtime execution) is the proof, not a second read. The `-r` flag is the user's explicit request for an adversarial pass; without it, no `code-reviewer` is spawned.

## Context

- Git state: !`git status`
- Current branch: !`git branch --show-current`

## Usage

```
/fix [error description or context]
/fix -a [error]          # Auto mode — minimal confirmations
/fix -r [error]          # Review mode — adversarial review of the fix
/fix -w [error]          # Worktree mode — commit + push after fix for local review
```

## Flags

| Flag | Trigger | Description |
|------|---------|-------------|
| `auto_mode` | `-a`, `--auto` | Auto-select recommended solution, minimal prompts |
| `review_mode` | `-r`, `--review` | Adversarial review of the fix by `code-reviewer` (verify, layer 3b) |
| `worktree_mode` | `-w`, `--worktree` | Require execution inside a git worktree; commit + push the fix so the user can review locally |

## Core Principle

> Tests passing ≠ fix working. Always execute the actual code path.

The Verification Pyramid:
1. **Static analysis** — syntax, imports, types
2. **Automated checks** — build, lint, tests
3. **Runtime execution** (CRITICAL) — actual behavior, real execution
4. **User confirmation** — manual review

~20-40% of fixes that pass tests still fail at runtime. NEVER skip layer 3.

## Team Agents

| Agent | Role | Used in |
|-------|------|---------|
| `team-architect` | Explores codebase impact, validates solution feasibility; reconciles `docs/architecture.md` when the fix changes documented behavior | Analyze, Find Solutions, Verify |
| `team-dev` | Implements the fix (full-stack or ambiguous) | Fix |
| `team-dev-front` | Implements frontend fixes (components, pages, CSS) | Fix |
| `team-dev-back` | Implements backend fixes (API, DB, services) | Fix |
| `team-pm` | Reconciles PRD when the fix invalidates a documented requirement/AC | Verify |
| `team-ux` | Reconciles UX docs when the fix changes a documented user flow/behavior (UI fixes) | Verify |
| `code-reviewer` | Adversarial review of the fix (security, logic, regression) — only with `-r` | Verify |

## State Variables

```
{error_context}       - User's error description
{auto_mode}           - Boolean
{review_mode}         - Boolean
{worktree_mode}       - Boolean
{branch_name}         - Current branch (captured in worktree mode)
{error_analysis}      - Root cause analysis results
{debug_logs}          - Tracked debug logs (for cleanup)
{solutions}           - Researched solutions list
{selected_solution}   - User's chosen solution
{files_modified}      - Files changed during fix
{verification_result} - Multi-layer verification outcome
```

## Workflow

```
step-00-init → step-01-analyze → [step-01b-log-technique]
  → step-02-find-solutions → step-03-propose
  → step-04-fix → step-05-verify
```

## Entry Point

**Complete ALL steps in sequence. User feedback is applied within the current step, then continue to the next. NEVER exit early.**

Load and execute `steps/step-00-init.md`
