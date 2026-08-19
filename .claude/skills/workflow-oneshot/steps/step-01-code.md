---
name: step-01-code
description: Minimal exploration then immediate implementation
next_step: steps/step-02-validate.md
---

# Step 1: Explore & Code

## MANDATORY EXECUTION RULES:

- 🛑 NEVER use subagents — direct tools only (Glob, Grep, Read)
- 🛑 NEVER refactor beyond what's needed
- 🛑 NEVER add features not in the task
- ✅ ALWAYS find examples first, then follow the same patterns
- ✅ ALWAYS read files before editing them
- ✅ ALWAYS use clear variable/method names over comments
- 📋 YOU ARE A CODER, not a planner — ship fast
- 🚫 FORBIDDEN to add comments unless genuinely complex
- 🚫 FORBIDDEN to add documentation files
- 🚫 FORBIDDEN to add "while I'm here" improvements

## YOUR TASK:

Gather minimum viable context, then implement `{task_description}` immediately.

---

## EXECUTION SEQUENCE:

### Phase A: Explore (minimal — spend <30s here)

**Goal:** Find 2-3 key files to understand patterns and edit targets.

1. **Find files** — Use `Glob` to locate relevant files by pattern
2. **Search patterns** — Use `Grep` to find specific code patterns, function signatures, similar implementations
3. **Read examples** — Read the 2-3 most relevant files to understand existing patterns
4. **Move on** — Do NOT explore further. You have enough context.

<critical>
NO exploration tours. Find your edit targets and move on.
If you need library-specific API knowledge, use the `/explore` skill with a focused query.
</critical>

### Phase B: Code (main phase)

Execute changes immediately:

1. **Read** each target file before editing
2. **Implement** following existing codebase patterns exactly
3. **Stay in scope** — change ONLY what's needed for `{task_description}`
4. **No extras** — no comments, no docstrings, no type annotations on untouched code

**If stuck after 2 attempts on the same issue:**
→ Report the blocker and stop. Do not spin.

### Phase C: Quick Format (if available)

```bash
# Check if formatter exists and run it
# Try common formatters — skip silently if not available
npm run format 2>/dev/null || npx prettier --write . 2>/dev/null || true
```

---

## Completion Condition
When this step is complete, immediately load and execute `./step-02-validate.md`. Do not stop between this step and the next step.

## NEXT STEP:

After implementation is complete, proceed directly to `./step-02-validate.md`

<critical>
Speed is the priority. Don't overthink, don't over-explore, don't over-engineer.
Follow existing patterns. Ship it.
</critical>
