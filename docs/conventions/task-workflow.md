# Task Workflow

> **When to use this document:** Read this when starting work, creating tasks, updating task status, or completing tasks. This document defines the complete task lifecycle using Task Master AI.

## Lifecycle Steps

| Step | Section | When |
|------|---------|------|
| **Find next task** | [Starting Work](#starting-work) | Beginning a session |
| **Set in-progress** | [Starting Work](#starting-work) | Before any work |
| **Update progress** | [Session Continuity](#session-continuity) | During work |
| **Run task-check** | [Completing Tasks](#completing-tasks) | Before marking done |
| **Get approval** | [Completing Tasks](#completing-tasks) | After task-check passes |
| **Mark done** | [Completing Tasks](#completing-tasks) | After approval |
| **Create task** | [Creating Tasks](#creating-tasks) | New work identified |

---

## Starting Work

```bash
task-master next                                    # Find next available task
task-master show <id>                               # Review task details
task-master set-status --id=<id> --status=in-progress   # Mark as in-progress
```

**Before any work:** Always set the task to `in-progress`. Never start work on a task without marking it first.

When starting work on a specific task, read related files (PRD, referenced code) to get full context.

---

## Session Continuity

The conversation could end at any point. The next session needs to easily identify what to do next.

**Update progress regularly** by editing `.taskmaster/tasks/tasks.json`:

```bash
# Tasks are nested under .master.tasks array, NOT at root level
jq '.master.tasks |= map(if .id == 17 then .details += "\n\n[timestamp] Progress note here" else . end)' \
  .taskmaster/tasks/tasks.json > tmp.json && mv tmp.json .taskmaster/tasks/tasks.json
```

**Include in progress notes:**
- Specific file paths and line numbers
- Concrete next steps
- Design decisions and rationale
- References to screenshots, mockups, or external resources

Each note should enable another person to continue immediately.

---

## Completing Tasks

### Task-Check Protocol

Before marking any task done, run task-check:

```
Use the Task tool with subagent_type "task-check". Provide:
1. Task ID: From task file name or number
2. Task location: File path or CLI command to retrieve task details
3. Work summary: Files modified, changes made, decisions, what you skipped
4. Attempt: Which attempt (1, 2, or 3). Start with 1.
```

### Handling the Response

**If STATUS = PASS:**
Work is complete. Proceed to get approval.

**If STATUS = FAIL:**
Read the ISSUES section. For each issue:

| Issue Type | Action |
|------------|--------|
| Unfinished requirements | Fix immediately |
| Missing acceptance criteria | Fix immediately |
| Bugs or broken code paths | Fix immediately |
| Missing expected edge cases | Fix immediately |
| Minor fixes (typos, formatting) | Fix immediately |
| Significant changes (architecture, new features) | STOP. Ask user first. |

After fixing, re-run task-check.

**If STATUS = NEED_INFO:**
- If answer is in task/PRD/codebase: Answer yourself and re-run
- If only user can decide: Ask user, wait, then re-run

### Loop Behavior

Keep running task-check until:
- STATUS = PASS, or
- User says to stop ("that's fine", "skip the check"), or
- 3 attempts reached

**After 3 failed attempts:** Stop. Tell user: "task-check has failed 3 times. Outstanding issues: [list]. I need guidance."

### Get Approval

After task-check passes:

1. List all acceptance criteria and what you completed
2. Ask: "Can I mark task-XXX as complete and commit?"
3. Wait for explicit approval
4. Only after approval: update status + commit

**If thinking "task is done, let me mark it complete" → STOP. Ask first.**

### Mark Done

```bash
task-master set-status --id=<id> --status=done
```

**Never mark done when:**
- Work is incomplete ("I'll finish this later")
- Something isn't working ("I'll create a follow-up task")
- You haven't asked for approval

→ Mark as `blocked` if incomplete. Ask for approval if complete.

### Commit changes

Commit all changes include any task files

### Documentation check

Should any of the project's documentation be updated (including claude.md files) based on the work that was done? Would AI or humans benefit by improving the documentation? Don't just add documentation for the sake it.

---

## Creating Tasks

### Step 1: Generate Task Content

Use the `/create-tasks` skill to generate well-formed task content:

```
/create-tasks
```

This skill:
- Validates task size (max 1 day, vertical slice)
- Applies INVEST criteria
- Ensures proper structure with context, acceptance criteria, dependencies
- Splits epics using SPIDR techniques

### Step 2: Add to Backlog

Once the skill generates task content, add it to taskmaster:

```bash
task-master add-task \
  --title="Task title from skill output" \
  --description="Brief description" \
  --details="Full task content from skill output" \
  --priority="high|medium|low" \
  --dependencies="1,2,3"
```

**Never use `--prompt` flag.**

### PRD to Tasks

1. Find the PRD in `docs/project/PRD/active/`
2. Use `/create-tasks` skill to generate task content from deliverables
3. Add each task to backlog with `task-master add-task`
4. Verify: `task-master show <id>`

**Never use `task-master parse-prd`** — it uses AI and produces unreliable results.

### Banned AI Commands

Do not use these commands (they invoke AI, which is wasteful and unreliable):
- `task-master update-task`
- `task-master parse-prd`
- `task-master add-task --prompt`

---

## Ground Rules

1. **Set in-progress before any work** — `task-master set-status --id=<id> --status=in-progress`

2. **Get approval before marking done** — List criteria, ask permission, wait for response

3. **Frequent progress updates** — Document in tasks.json for session continuity

4. **One task at a time** — Never start a new task while another is in-progress

5. **Capture requirements immediately** — When user gives requirements, add to task acceptance criteria or create new task before implementing

6. **Commit tasks.json** — Always commit the tasks file with your changes, otherwise progress is lost

7. **Propose new tasks** — When insights emerge that don't fit current tasks, propose new ones

8. **Check task status first** — Before decisions, run `task-master show <id>` to see all progress notes

---

## Quick Reference

### Essential Commands

| Command | Purpose |
|---------|---------|
| `task-master list` | Show all tasks with status |
| `task-master next` | Get next available task |
| `task-master show <id>` | View task details (e.g., `task-master show 1.2`) |
| `task-master set-status --id=<id> --status=<status>` | Update task status |
| `task-master add-task --title="..." --description="..."` | Create new task |

### Task ID Format

- Main tasks: `1`, `2`, `3`
- Subtasks: `1.1`, `1.2`, `2.1`
- Sub-subtasks: `1.1.1`, `1.1.2`

### Status Values

| Status | Meaning |
|--------|---------|
| `pending` | Ready to work on |
| `in-progress` | Currently being worked on |
| `done` | Completed and verified |
| `blocked` | Waiting on external factors |
| `deferred` | Postponed |
| `cancelled` | No longer needed |

### Task Fields

```json
{
  "id": "1.2",
  "title": "Implement user authentication",
  "description": "Set up JWT-based auth system",
  "status": "pending",
  "priority": "high",
  "dependencies": ["1.1"],
  "details": "Implementation notes and progress...",
  "testStrategy": "Unit tests for auth, integration tests for login"
}
```

---

## Project Structure

```
.taskmaster/
├── tasks/
│   └── tasks.json          # Main task database
└── config.json             # AI model settings (use task-master models)
```

---

## Troubleshooting

### Task File Sync Issues

```bash
task-master generate        # Regenerate task files from tasks.json
task-master fix-dependencies # Fix dependency issues
```

### Validate Dependencies

```bash
task-master validate-dependencies
```

**Do not re-initialize.** Running `task-master init` again just re-adds the same files.
