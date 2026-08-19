---
name: oneshot
description: Fast feature implementation for small tasks — Explore, Code, Validate. Use instead of apex for focused, single-scope changes.
argument-hint: "[-b] [-pr] [-w] <task description>"
---

# OneShot — Fast Feature Workflow

Ship small features fast. Explore minimal context, code, validate. Done.

## Output Language (CRITICAL)

Everything the user reads is written in **French**: step summaries, progress lines, `AskUserQuestion` questions and options, validation reports, blocker messages, final recap. Use correct French with every accent (é, è, ê, à, ç, ô, î, ï, ù, û).

The output blocks printed in this file and in `steps/*.md` are English templates — render them in French, keeping their structure, emoji, and variable names.

Everything else stays in English: code, comments, identifiers, file and branch names, commit messages, PR titles and descriptions, generated documents, and agent-to-agent prompts.

## Concision (CRITICAL)

Default to the shortest output that does the job. Length is not proof of effort.

- **Answers** — what changed, in one or two lines. Detail only when the user asks for it.
- **Scope** — do exactly what was asked, nothing adjacent (see Constraints below).
- **Code comments** — only for a non-obvious *why*. Never restate the line below.
- **Documentation** — patch the lines that changed. No new doc file, ever.
- **Commits & PRs** — one-line subject; a body only when the change genuinely needs one.
- **Step reports** — the output blocks in `steps/*.md` are already the short form. Render them as-is, without surrounding prose.

No review pass here: OneShot ships small, verified changes. When a change warrants an adversarial review, run `/apex -x` instead.

## Context

- Git state: !`git status`
- Current branch: !`git branch --show-current`

## Usage

```
/oneshot add logout button to navbar
/oneshot -b fix date formatting in dashboard
/oneshot -pr add email validation to signup form
/oneshot -w add toast on save success
```

## Flags

| Flag | Long | Description |
|------|------|-------------|
| `-b` | `--branch` | Verify not on main, create branch if needed |
| `-pr` | `--pull-request` | Create PR at end (enables -b) |
| `-w` | `--worktree` | Require execution inside a git worktree; commit + push so the user can review locally (enables -b) |

## When to use OneShot vs Apex

| Use OneShot | Use Apex |
|-------------|----------|
| Single file or 2-3 related files | Cross-cutting changes across many files |
| Familiar stack, known patterns | Unfamiliar library or complex integration |
| Bug fix, small feature, UI tweak | Major feature, architecture change |
| Clear requirements, obvious approach | Ambiguous requirements, needs research |

## State Variables

```
{task_description}    - What to implement
{feature_name}        - Kebab-case identifier
{branch_mode}         - Boolean
{pr_mode}             - Boolean
{worktree_mode}       - Boolean
{branch_name}         - Current branch name
```

## Workflow

```
step-00-init → step-01-code → step-02-validate
```

## Constraints

- ONE task only — no tangential improvements
- NO new documentation files — but if the change materially affects EXISTING project docs (`docs/prd.md`, `docs/architecture.md`, `docs/ux*.md`), reconcile them at validate (step-02, section 2b)
- NO refactoring outside immediate scope
- NO "while I'm here" additions
- Direct tools only — no subagents, EXCEPT the doc reconciliation at step-02 which may use `team-pm` / `team-architect` / `team-ux` for the affected doc(s)
- If stuck > 2 attempts: report blocker and stop

## Entry Point

**Complete ALL steps in sequence. User feedback is applied within the current step, then continue to the next. NEVER exit early.**

Load and execute `steps/step-00-init.md`
