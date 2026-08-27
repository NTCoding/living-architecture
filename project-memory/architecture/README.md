# Architecture Memory

Architecture memory stores approved reusable architectural reasoning for planning.

It helps future architecture definition stages remember how this project reasons about trade-offs, responsibility placement, project conventions, Rivière role definitions, and architectural anti-patterns.

Architecture memories are advisory. They help an agent reason; they are not automatic rules. If a memory seems relevant but the fit is unclear, clarify with the user before relying on it.

## Directory structure

```text
project-memory/architecture/
  AGENTS.md
  README.md
  memories/
    <memory-slug>.md
```

Store one memory card per file under `project-memory/architecture/memories/`.

## Memory-card frontmatter

Each memory card must start with this frontmatter:

```yaml
---
status: approved
dateAdded: YYYY-MM-DD
systemAreas:
  - global
architectureConcepts:
  - component-responsibility
source: docs/project/PRD/<planning-id>/ARCH.md
---
```

Frontmatter is for retrieval. The body of the memory card carries the reasoning and nuance.

### `status`

Allowed values:

- `approved` — user-approved memory that may inform future planning.
- `superseded` — memory kept for traceability but no longer used as current guidance.

Do not create unapproved memory cards. If a candidate memory is still being discussed, keep it in the current conversation or planning artefact until the user approves it.

### `dateAdded`

Use the date when the memory was added, in `YYYY-MM-DD` format.

This is used as a retrieval signal. Newer memories may better reflect the current project context, but older memories may still be relevant.

### `systemAreas`

`systemAreas` identifies the actual project or system area where the memory should be considered in future architecture discussions.

Use only these values unless the user approves a new one and this README is updated first:

- `global`
- `project-memory`
- `dev-workflow-v2`
- `riviere-query`
- `riviere-builder`
- `riviere-cli`
- `riviere-schema`
- `riviere-extract-config`
- `riviere-extract-conventions`
- `riviere-extract-ts`
- `eclair`
- `docs`

Use `global` when the memory is cross-cutting or not tied to one specific system area.

Do not put architecture topics, technology topics, or concerns in `systemAreas`. For example, CLI formatting is an architecture concept, not a system area.

### `architectureConcepts`

`architectureConcepts` identifies the kind of architecture reasoning that should retrieve the memory.

Use only these values unless the user approves a new one and this README is updated first:

- `boundary-placement` — deciding which package, app, module, or layer owns a responsibility.
- `component-responsibility` — deciding what a component should or should not do.
- `project-conventions` — interpreting or applying repository architecture conventions and anti-pattern guidance.
- `riviere-role-understanding` — understanding or applying Rivière role definitions and role-selection guidance.
- `cli-formatting` — deciding where CLI output formatting, presentation, or consumer-facing translation belongs.
- `trade-off-reasoning` — reusable reasoning about architectural trade-offs and preferred option-selection criteria.
- `product-feasibility-impact` — recognising when architecture findings should return planning to solution exploration or PRD drafting.
- `domain-service` — deciding whether stateless domain behaviour genuinely has no natural aggregate or value object owner.
- `value-object` — identifying immutable domain concepts that should own their parsing, normalisation, and invariants.
- `domain-modeling` — applying domain modelling reasoning to discover concepts, ownership, boundaries, and responsibilities.

Do not record concepts as system areas.

If none of the existing concepts fit, ask the user whether a new concept should be introduced. Update this README before using the new concept in a memory card.

### `source`

`source` records where the memory came from.

Use a specific path where possible, such as:

- `docs/project/PRD/<planning-id>/ARCH.md`
- `docs/project/PRD/<planning-id>/solution-exploration.md`
- `docs/architecture/adr/<adr-file>.md`
- `conversation: <short description>`

`source` is not the same as `systemAreas`. A memory may be discovered while discussing one package but apply globally.

## Memory-card body

Use this structure unless the user approves a different shape for a specific memory:

```md
# <Memory title>

## Memory

<approved reusable architecture reasoning>

## Why this matters

<approved reasoning, context, or trade-off>

## Consider this when

- <future situation where this memory may be relevant>

## Do not apply automatically when

- <known exception or context where the memory may not fit>

## Clarify with the user when

- <uncertainty that should trigger user confirmation>

## Related references

- <related PRD, ARCH, ADR, role definition, convention, issue, PR, or "None recorded">
```

The body should preserve the user's approved meaning. Prefer the user's real words when they are already clear.

## Querying architecture memory

When querying architecture memory during architecture planning:

1. Identify the actual system areas involved in the current architecture discussion.
2. Include `global` when cross-cutting memories may apply.
3. Identify the architecture concepts involved in the current discussion.
4. Search memory-card frontmatter for matching `systemAreas` and `architectureConcepts`.
5. Read the matching memory cards before presenting architecture options or approval findings.
6. Use `dateAdded` as a recency signal, not as an automatic priority rule.
7. If a memory seems relevant but not clearly applicable, ask the user whether it applies.

Do not use architecture memory to invent requirements, product scope, technical constraints, or risks. Use it only as approved reasoning context.

## Creating architecture memory

Create a memory only when the user explicitly approves that the reasoning is worth saving.

Before writing a memory:

1. Explain why the insight appears reusable beyond the current artefact.
2. Propose the exact memory text and frontmatter.
3. Confirm the `systemAreas` and `architectureConcepts` with the user.
4. Ask whether any exceptions or clarification triggers should be recorded.
5. Write the memory only after the user approves the content.

Do not save an agent assumption as architecture memory.

## Updating architecture memory

Update a memory only when the user approves the change.

If a memory is no longer current, prefer setting `status: superseded` and adding a note in the body rather than deleting it. Deletion should be reserved for mistakes, duplicates, or user-requested removal.

If two memories overlap, ask before merging them. Do not silently combine memories with different context or reasoning.
