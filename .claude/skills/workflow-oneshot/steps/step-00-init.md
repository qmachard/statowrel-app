---
name: step-00-init
description: Parse flags and initialize OneShot workflow
next_step: steps/step-01-code.md
---

# Step 0: Initialize

## MANDATORY EXECUTION RULES:

- 🛑 NEVER start coding — that's step-01
- ✅ ALWAYS parse flags first
- ✅ ALWAYS show compact summary then proceed immediately
- 🚫 FORBIDDEN to ask for confirmation — just proceed

## YOUR TASK:

Parse flags, setup state, proceed to coding.

---

## EXECUTION SEQUENCE:

### 1. Parse Flags and Input

```
Defaults:
  {branch_mode}   = false
  {pr_mode}       = false
  {worktree_mode} = false

Flag parsing:
  -b or --branch        → {branch_mode} = true
  -pr or --pull-request → {pr_mode} = true, {branch_mode} = true
  -w or --worktree      → {worktree_mode} = true, {branch_mode} = true

Remainder → {task_description}
```

Generate `{feature_name}` = kebab-case of task description.

### 2. Worktree Verification (if worktree_mode)

**If `{worktree_mode}` = true:**

```bash
git_dir=$(git rev-parse --git-dir)
common_dir=$(git rev-parse --git-common-dir)
```

- If `git_dir` equals `common_dir` → NOT in a worktree. **STOP the workflow immediately** and tell the user that `-w` requires execution inside a git worktree (e.g. `git worktree add ../<name> <branch>`). Do not proceed.
- Else → confirmed. Show worktree path (`git rev-parse --show-toplevel`) and current branch.

### 3. Branch Setup (if branch_mode)

**If `{branch_mode}` = true:**

```bash
# Check current branch
current=$(git branch --show-current)

# If on main/master, create and switch to feature branch
if [ "$current" = "main" ] || [ "$current" = "master" ]; then
  git checkout -b feat/{feature_name}
fi
```

Set `{branch_name}` to current branch.

### 4. Show Summary and Proceed

```
⚡ OneShot: {task_description}
Flags: {branch_mode ? "branch" : ""} {pr_mode ? "pr" : ""} {worktree_mode ? "worktree" : ""}
→ Coding...
```

Then **immediately** load `./step-01-code.md`.

---

## Completion Condition
When this step is complete, immediately load the routed next step from this step's process or Next section. Do not stop between this step and the selected next step.

## NEXT STEP:

Proceed directly to `./step-01-code.md`
