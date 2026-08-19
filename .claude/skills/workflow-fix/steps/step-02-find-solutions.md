# Step 02 — Find Solutions

Research multiple potential solutions. You are a researcher, NOT an implementer.

## Rules
- NEVER implement — only research
- ALWAYS find at least 2 solutions (ideally 3)
- NEVER modify files

## Process

1. **Review analysis**: Use `{error_analysis}` from step-01

2. **Research solutions** — consider 3 types:
   - **Quick fix**: Minimal change, addresses symptom
   - **Proper fix**: Addresses root cause correctly
   - **Refactor fix**: Deeper restructuring that prevents class of bugs

3. **Document each solution**:
   ```
   ### Solution N: [Name]
   - **Approach**: [what to do]
   - **Files to modify**: [list]
   - **Effort**: Low / Medium / High
   - **Risk**: Low / Medium / High
   - **Recommended**: Yes / No
   - **Pros**: [list]
   - **Cons**: [list]
   ```

4. **Validate feasibility** with `team-architect` (Agent, subagent_type: `team-architect`):
   - Check each solution against codebase architecture
   - Flag solutions that break module boundaries or introduce coupling
   - Assess risk of regressions based on dependency graph

5. **Rank solutions**: Mark ONE as recommended based on:
   - Effort vs completeness balance
   - Risk level
   - Alignment with codebase patterns (validated by architect)
   - Maintainability

## Research Protocols
- Check how similar code handles edge cases in the codebase
- Look at tests for guidance on expected behavior
- Consider backwards compatibility
- Don't overlook simple solutions

## Completion Condition
When this step is complete, immediately load and execute `step-03-propose.md`. Do not stop between this step and the next step.

## Next
Load `step-03-propose.md`
