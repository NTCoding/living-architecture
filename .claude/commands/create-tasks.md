# Create Tasks

Generate well-formed tasks from PRD deliverables and add them to GitHub.

## Instructions

1. Read the active PRD from `docs/project/PRD/active/`
2. Break down deliverables into tasks that:
   - Are max 1 day of work (vertical slice)
   - Follow INVEST criteria
   - Have clear context, acceptance criteria, and dependencies
   - Use SPIDR techniques to split epics
3. For each task, run:
   ```bash
   ./scripts/create-task.sh "<milestone>" "[M<milestone>-D<deliverable>] <title>" "<body>"
   ```
   - Milestone = PRD filename without `PRD-` and `.md`
   - Title format: `[M<milestone>-D<deliverable>] <title>`
   - Body: task content with acceptance criteria
4. If a task depends on another, include `Depends on #X` in the body
