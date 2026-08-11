# Project Memory Agent Instructions

Project memory is the persistent cross-PRD planning layer for this repository.

When doing planning, discovery, PRD drafting, architecture planning, delivery planning, or future-project discussion, read `project-memory/README.md` and apply these instructions.

## Reading project memory

- Read `project-memory/README.md` before using or changing project memory.
- Read `project-memory/priorities.md` when discussing future work, sequencing, or what may come next.
- Read `project-memory/architecture/AGENTS.md` and `project-memory/architecture/README.md` before querying, creating, or updating architecture memories.
- Read relevant idea folders under `project-memory/ideas/` when the user names an idea, when choosing between future candidates, or when updating deferred work.
- During the initial `problem-definition` planning stage, do not use project-memory content such as `priorities.md` or idea folders as source material unless the user explicitly names it. The problem definition must come from the user, user-named sources, or already-approved problem-definition content.

## Updating project memory

Do not invent priorities, dependencies, need levels, user pain, reasons, risks, or timing signals.

Use the user's approved words as the source of truth. If a detail is unclear, ask before recording it.

## Architecture memory

Architecture memory lives under `project-memory/architecture/`.

It stores approved reusable architectural reasoning for planning. It is for lessons that should help future architecture decisions, including trade-off reasoning, responsibility-placement lessons, project-convention interpretation, misunderstood Rivière role definitions, and architectural anti-patterns.

Architecture memory is advisory, not automatic enforcement.

When working on architecture drafting or architecture approval:

1. Read `project-memory/architecture/AGENTS.md`.
2. Read `project-memory/architecture/README.md` for the frontmatter schema, approved metadata values, and memory-card structure.
3. Query memories by the actual system areas and architecture concepts relevant to the current architecture discussion.
4. Include `global` system-area memories when their architecture concepts are relevant.
5. If a memory seems relevant but the fit is unclear, ask the user whether it applies before using it to shape a recommendation.
6. If a reusable architecture insight emerges, propose concise memory-card text and ask the user whether it is worth saving before writing it.

Never create or update an architecture memory without explicit user approval of the memory content.

Do not use architecture memory to override an approved PRD, ADR, role definition, or repository convention. If a memory conflicts with a current artefact or convention, clarify with the user before proceeding.

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
