# Architecture

Draft `ARCH.md` once the PRD is approved.

## What the document must answer

- The components, and which one talks to which.
- Where each piece of state lives, and who writes it.
- The roles each file has, following `docs/architecture/adr/ADR-002-allowed-folder-structures.md`.
- The shape of every route, command and query that is new.
- What is decided and what is still open.

## Checklist before you tell Nick it is ready

- [ ] Every box on the diagram is a file or a process that exists or will exist.
- [ ] The folder tree follows ADR-002.
- [ ] Each open question is a `:::decision` block.
- [ ] The document quotes the code it changes.
