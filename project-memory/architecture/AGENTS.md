# Architecture Memory Agent Instructions

Architecture memory is the persistent planning layer for approved reusable architectural reasoning.

When querying, creating, or updating architecture memory, read `project-memory/architecture/README.md` first and follow it as the source of truth for frontmatter, metadata values, and memory-card structure.

## Purpose

Architecture memory helps future architecture definition stages reason with approved project context.

It may capture:

- trade-off reasoning
- bad architectural designs to avoid
- responsibility-placement lessons
- project-convention interpretation
- misunderstandings of Rivière role definitions
- architectural anti-patterns
- reasoning that should influence future architecture options or recommendations

Architecture memory is advisory. It is not automatic enforcement.

## Reading memories

During architecture drafting or architecture approval:

1. Read `project-memory/architecture/README.md`.
2. Identify relevant actual system areas from the current architecture discussion.
3. Include `global` when cross-cutting memories may apply.
4. Identify relevant `architectureConcepts` using the README vocabulary.
5. Search memory cards under `project-memory/architecture/memories/` for matching frontmatter.
6. Read relevant approved memory cards before presenting architecture options, recommendations, or approval findings.

If a memory seems relevant but the applicability is unclear, ask the user before relying on it.

Do not treat a memory as more authoritative than an approved PRD, ADR, role definition, repository convention, or current user decision.

## Writing memories

Never create or update an architecture memory without explicit user approval of the memory content.

When reusable architectural reasoning appears during planning:

1. Explain why it appears worth preserving for future reasoning.
2. Propose the exact frontmatter and memory-card body.
3. Confirm the `systemAreas` and `architectureConcepts` with the user.
4. Ask about exceptions, non-applicability, and clarification triggers.
5. Write the memory only after the user approves the content.

Use the user's approved words as the source of truth. Do not invent reasons, rules, risks, or constraints.

## Metadata discipline

- `systemAreas` must be actual project or system areas, or `global`.
- Architecture topics such as CLI formatting belong in `architectureConcepts`, not `systemAreas`.
- New metadata values require user approval and an update to `project-memory/architecture/README.md` before use.

## Stale or conflicting memories

If a memory conflicts with current context:

- do not ignore the conflict silently
- do not apply the memory automatically
- ask the user whether the memory still applies, should be superseded, or should be treated as irrelevant for the current decision

If a memory has been superseded, keep it for traceability unless the user asks to delete it.
