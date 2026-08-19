# Step 02b — Task Breakdown

Break the plan into individual task files with dependencies.

## Rules
- NEVER start implementing
- Each task: 1-3 files, completable in one session
- Include dependencies between tasks

## Process

1. **Analyze plan** from step-02 — group file changes into coherent tasks
2. **Create task files** in `{output_dir}/tasks/` (if save_mode) or just `TaskCreate` (dependencies are wired afterwards with `TaskUpdate` / `addBlockedBy` — never at creation time):

   ```
   ## Task NN: [Title]

   ### Objective
   [What this task accomplishes]

   ### Files
   - path/to/file.ts — [action: create/modify]

   ### Plan
   1. [Step 1]
   2. [Step 2]

   ### Acceptance Criteria
   - [ ] AC1
   - [ ] AC2

   ### Dependencies
   - Task MM (must be complete first)
   ```

3. **Build dependency graph** — `TaskUpdate` with `addBlockedBy` on every task that has prerequisites; identify which tasks can run in parallel
4. **Present summary**: task list + dependency graph + parallel groups
5. **Ask confirmation** (unless `{auto_mode}`) — **MUST use `AskUserQuestion`**. This is the LAST interactive gate before execution: if `{teams_mode}`, the orchestration that follows cannot ask anything.

## Completion Condition
When this step is complete, immediately load the routed next step from this step's process or Next section. Do not stop between this step and the selected next step.

## Next
- If `{teams_mode}` → load `step-03-execute-teams.md`
- Else → load `step-03-execute.md`
