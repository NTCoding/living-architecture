# Project Memory

Project memory is the persistent cross-PRD planning layer for `living-architecture`.

It exists to preserve context that should survive a single PRD without turning every idea into committed scope.

## What project memory remembers

Project memory is for:

- ideas discovered during planning
- work deferred from PRD scope
- known priorities
- confirmed dependencies or sequencing signals
- approved reusable architectural reasoning for future planning
- links to relevant research, prototypes, PRDs, implementation evidence, GitHub issues, and pull requests

## Core principles

- PRDs describe committed scope for one planning topic.
- Project memory preserves cross-PRD context, deferred work, sequencing, and planning signals.
- Architecture memory preserves approved reasoning that should help future architecture decisions.
- Ideas are not commitments. An idea becomes committed scope only when it is selected and shaped through a PRD.
- Architecture memories are advisory, not automatic rules. If a memory may apply but the fit is unclear, clarify with the user before relying on it.
- Deferred work should not disappear just because it is out of scope for the current PRD.
- Completed work should not be manually duplicated into project memory. Retrieve completed-work context from PRDs, git history, GitHub issues, GitHub PRs, and linked evidence when needed.

## Resources

### `AGENTS.md`

Operational instructions for AI agents and planning commands.

Use this when deciding how to read or update project memory.

### `priorities.md`

Confirmed priority list.

Use this for work the user has explicitly confirmed as prioritised, including why it matters, dependencies, and links to relevant ideas or PRDs.

Do not add priorities speculatively.

### `ideas/`

One directory per idea, deferred capability, or future PRD candidate.

Use this for anything that may need future planning but is not committed to the current PRD.

Each idea directory should contain an `idea.md` file. Add research notes, prototypes, or supporting material inside the idea directory as needed.

### `architecture/`

Approved reusable architectural reasoning for planning.

Use this for architecture memories that should inform future architecture definition stages, such as trade-off reasoning, responsibility-placement lessons, project-convention interpretation, misunderstood Rivière role definitions, and architectural anti-patterns.

Read `project-memory/architecture/README.md` before querying, creating, or updating architecture memories. That file is the source of truth for architecture-memory frontmatter, allowed retrieval metadata, and memory-card structure.

## Deferred-work triage

When planning identifies work that is outside the current PRD scope, it should be triaged rather than discarded.

Ask whether the item is:

- explicitly not needed
- probably needed later
- definitely needed later
- uncertain and needing more discussion

Items that are probably or definitely needed later should be captured under `project-memory/ideas/`.

Items that are explicitly not needed should usually remain only as concise out-of-scope context in the current PRD, unless the user confirms that the decision should be remembered more broadly.

Uncertain items should be clarified before they are treated as future work.

## Retrieval-first history

Project memory should not become a manual duplicate of project history.

When discussing future work, retrieve context from:

- existing PRDs and their status
- `project-memory/priorities.md`
- relevant approved architecture memories under `project-memory/architecture/memories/`
- relevant idea folders
- git history
- GitHub issues and pull requests
- linked research, prototypes, or notes
