# Ideas

Each idea, deferred capability, or future PRD candidate should live in its own directory under `project-memory/ideas/`.

Use one directory per idea so research, notes, prototypes, and links can grow without turning the backlog into one large file.

## When to create an idea folder

Create or update an idea folder when planning identifies work that is outside the current PRD scope and the user confirms it is:

- probably needed later
- definitely needed later

Do not create an idea folder for something that is explicitly not needed unless the user confirms that the decision should be remembered more broadly.

## Status values

Use one of these values unless the user approves another value:

- Captured
- Exploring
- Candidate PRD
- Prioritised
- Planned
- Not Now

## Need levels

Use one of these values:

- Probably needed
- Definitely needed
- Uncertain

## `idea.md` template

```md
# <Idea Name>

**Status:** Captured

**Need level:** Probably needed / Definitely needed / Uncertain

**Source:** <PRD, planning session, discussion, issue, PR, or other source>

**Reason deferred:** <why this is not in the current PRD>

**Priority signal:** <confirmed signal or "None confirmed">

**Dependencies:** <confirmed dependencies or "None confirmed">

---

## Summary

<short description of the idea or capability>

## Why this may matter

<user-confirmed reason, or "Not yet confirmed">

## Open questions

- <question or "No open questions recorded yet">

## Links

- <related PRD, research, prototype, issue, PR, or note>
```
