---
name: review-feedback
description: Load PR review feedback and apply corrections immediately
argument-hint: "[PR number | owner/repo#N | PR URL]"
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

# Review Feedback — Apply PR Review Corrections

Load the review comments on a pull request and apply the corrections directly.

## Interactive Stops (CRITICAL — overrides permission mode)

Every confirmation, clarification, or choice point in this workflow **MUST** be performed by calling the `AskUserQuestion` tool — never as plain text expecting a reply, never as a "let me know" sentence, never as a presented summary followed by silence.

- `AskUserQuestion` forces a real stop and waits for the user input, **even when permission mode is `bypassPermissions`**. Plain text prompts do NOT stop in bypass mode — Claude will silently continue.
- This applies to: the Phase 3 apply gate, any ambiguous correction, and any failing test that needs guidance.
- The commit at the end of Phase 4 is authorized by the Phase 3 gate. Pushing is NOT — never push.

## Output Language (CRITICAL)

Everything the user reads is written in **French**: the Phase 3 feedback summary, `AskUserQuestion` questions and options, correction explanations, blocker messages, final status. Use correct French with every accent (é, è, ê, à, ç, ô, î, ï, ù, û).

The output blocks printed in this file are English templates — render them in French, keeping their structure, emoji, and variable names. Review comments quoted from the PR stay in their original language.

Everything else stays in English: code, comments, identifiers, file and branch names, and commit messages.

## Concision (CRITICAL)

Default to the shortest output that does the job. Length is not proof of effort.

- **Answers** — the Phase 3 summary is one line per comment. No restating the reviewer's comment in full, no preamble.
- **Scope** — apply the requested corrections, nothing adjacent. A comment is not an invitation to refactor around it.
- **Code comments** — explain a correction inline only when the *why* is non-obvious; otherwise the commit message carries it.
- **Documentation** — patch the lines that changed. No new doc file unless a reviewer asked for one.
- **Commits** — one-line subject; a body only when several corrections need distinguishing.

## Context

- Current branch: !`git branch --show-current`
- Working tree status: !`git status --short`
- Current PR: !`gh pr view --json number,title,state,url 2>/dev/null || echo "none"`

## Usage

Invoke without an argument for the current PR, or pass a number, `owner/repo#N`, or a URL:

```
/review-feedback                                    # current PR
/review-feedback 123                                # PR #123
/review-feedback owner/repo#123                     # external PR
/review-feedback https://github.com/owner/repo/pull/123
```

## State Variables

```
{pr_ref}              - PR number, owner/repo#N, or URL (defaults to current branch's PR)
{pr_title}            - PR title
{required_changes}    - Comments that map to a directly applicable change
{discussions}         - Comments needing clarification before acting
{suggestions}         - Nice-to-have comments, not critical
{files_modified}      - Files changed while applying corrections
```

## Workflow

```
Phase 1 Fetch → Phase 2 Analyze → Phase 3 Present → Phase 4 Act
```

### Phase 1 — Fetch

Retrieve the PR details and its review comments:

1. **Determine the PR**: use the argument if provided, otherwise infer it from the current branch
2. **Fetch details**: `gh pr view <PR>`
3. **Fetch comments**: `gh api repos/:owner/:repo/pulls/:number/comments`
4. **Fetch review status**: `gh pr status` for the overall state

**Stop if:**
- No PR on the current branch AND no argument provided
- The PR does not exist or is not accessible

### Phase 2 — Analyze

Parse and synthesize the feedback:

1. Group comments by file
2. Classify each comment:
   - **Required changes** — directly applicable
   - **Discussions** — need clarification before acting
   - **Suggestions** — nice-to-have, not critical
3. Check CI and test statuses
4. Produce a structured summary

### Phase 3 — Present

Display the feedback, grouped by classification:

```
📋 PR: #123 "Feature title"
👤 Reviewer: you
✅ Status: Ready for changes

Required changes (3)
- file.ts:42 → Change X to Y (specifics)
- api.ts:18 → Add missing validation
- test.ts:8 → Update assertion

Discussions (2)
- Should we handle edge case Z?

Suggestions (1)
- Consider refactoring helper function
```

**Then ask (via `AskUserQuestion`)** whether to apply the corrections:
- Apply them → continue to Phase 4
- Show only, change nothing → stop
- More information needed first → pause

### Phase 4 — Act

Apply the corrections one by one:

1. For each correction:
   - Locate the file and line
   - Apply the change
   - Check the syntax when possible
   - **Explain the correction** — why it was applied, in a code comment or in the commit message
2. Run the tests if the project has any (`npm test`, `bun test`, …)
3. If tests fail: show the errors and ask for guidance
4. Commit with a message that states what was applied

**Stop if:**
- The user cancels
- Too many changes are ambiguous — ask for clarification instead of guessing
- Tests fail after a correction

### Final

- Show the resulting diff
- Report the status: `✅ Done — PR ready for push`

## Rules

- **CONTEXT-AWARE**: infer the PR from the current branch by default
- **NO GUESSING**: when a change is ambiguous, ask instead of picking an interpretation
- **TEST-DRIVEN**: run the tests after applying corrections, whenever the project has them
- **REVERSIBLE**: every change lands in git, so it stays easy to undo
- **DOCUMENTED CHANGES**: the commit message says which comments were addressed — one line each, no essay
- **NEVER PUSH**: commit only; pushing is the user's call

## Example

```bash
$ /review-feedback
📋 PR #42 "Add user auth"
👤 Your comments (3)

Required changes:
1. src/auth.ts:15 → Add null check for user
2. src/api.ts:42 → Fix type error
3. tests/auth.test.ts:8 → Update mock

Apply these corrections? → yes
✅ Fixed src/auth.ts
✅ Fixed src/api.ts
✅ Fixed tests/auth.test.ts
✅ Tests passing
✅ Commit created: "🐛 Apply review feedback on user auth"
```
