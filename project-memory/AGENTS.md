# Project Memory Agent Instructions

Project memory is the persistent cross-PRD planning layer for this repository.

When doing planning, discovery, PRD drafting, architecture planning, delivery planning, or future-project discussion, read `project-memory/README.md` and apply these instructions.

## Reading project memory

- Read `project-memory/README.md` before using or changing project memory.
- Read `project-memory/priorities.md` when discussing future work, sequencing, or what may come next.
- Read relevant idea folders under `project-memory/ideas/` when the user names an idea, when choosing between future candidates, or when updating deferred work.
- During the initial `problem-definition` planning stage, do not use project-memory content such as `priorities.md` or idea folders as source material unless the user explicitly names it. The problem definition must come from the user, user-named sources, or already-approved problem-definition content.

## Updating project memory

Do not invent priorities, dependencies, need levels, user pain, reasons, risks, or timing signals.

Use the user's approved words as the source of truth. If a detail is unclear, ask before recording it.

## Out-of-scope triage

When the user says an item is out of scope, deferred, not for this PRD, later, future work, not now, or similar, treat it as a triage point rather than a deletion.

Ask, or confirm if the user already said clearly, whether the item is:

- explicitly not needed
- probably needed later
- definitely needed later
- uncertain and needing more discussion

If the item is probably or definitely needed later:

1. Create or update an idea folder at `project-memory/ideas/<idea-slug>/`.
2. Add or update `idea.md` in that folder.
3. Record:
   - idea or capability name
   - status
   - need level
   - source PRD, planning session, or conversation context
   - reason it was deferred from the current PRD
   - confirmed priority signals, if any
   - confirmed dependencies, if any
   - open questions
   - links to related PRDs, research, prototypes, issues, or PRs
4. Keep the current PRD focused by recording only the concise scope decision there, with a link to the idea folder when useful.

If the item is explicitly not needed:

- Do not create an idea folder unless the user confirms that the decision should be remembered more broadly.
- Keep it as concise out-of-scope context in the current PRD or planning artefact.

If the item is uncertain:

- Ask a clarifying question before recording it as future work.
- Use the current planning artefact's open questions area if it may affect the current PRD.

## Idea folder guidance

Use a short kebab-case slug for idea folders.

Before creating a new folder, check whether a matching or overlapping idea already exists. If it is not clear whether two ideas are the same, ask the user rather than merging them silently.

Use `project-memory/ideas/README.md` as the idea template source.

## Priorities guidance

Only add or reorder items in `project-memory/priorities.md` when the user explicitly confirms the priority.

Priority entries should explain why the item is prioritised and link to supporting idea folders, PRDs, research, issues, or PRs where available.

## Retrieval-first history

Do not manually duplicate completed-work history into project memory.

When a future planning discussion needs implementation context, retrieve it from existing PRDs, git history, GitHub issues, GitHub pull requests, and linked evidence.
