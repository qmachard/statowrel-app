# APEX: {{task_id}}

Created: {{timestamp}}
Task: {{task_description}}

## Configuration

| Flag | Value |
|------|-------|
| auto | {{auto_mode}} |
| examine | {{examine_mode}} |
| save | {{save_mode}} |
| test | {{test_mode}} |
| economy | {{economy_mode}} |
| branch | {{branch_mode}} |
| pr | {{pr_mode}} |
| interactive | {{interactive_mode}} |
| tasks | {{tasks_mode}} |
| teams | {{teams_mode}} |

Branch: {{branch_name}}

## User Request

{{original_input}}

## Acceptance Criteria

_Inferred during analysis_

## Progress

| Step | Status | Timestamp |
|------|--------|-----------|
| 00-init | ⏸ Pending | |
| 01-analyze | ⏸ Pending | |
| 02-plan | ⏸ Pending | |
| 02b-tasks | {{tasks_status}} | |
| 03-execute | ⏸ Pending | |
| 04-validate | ⏸ Pending | |
| 05-examine | {{examine_status}} | |
| 06-resolve | {{examine_status}} | |
| 07-tests | {{test_status}} | |
| 08-run-tests | {{test_status}} | |
| 09-finish | {{pr_status}} | |
