# Step 00b — Save Setup

## Process

1. Run `scripts/setup-templates.sh` with all state variables
2. Capture `{task_id}` and `{output_dir}` from script output
3. Output directory: `.claude/output/apex/{task_id}/`

## Completion Condition
When this step is complete, immediately return to `step-00-init.md` and continue from there. Do not stop between this step and the resumed step.

## Return
Return to `step-00-init.md` with `{task_id}` and `{output_dir}` set.
