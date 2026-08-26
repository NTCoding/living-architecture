# AGENTS.md

Read and follow all instructions in @CLAUDE.md

If you are not explicitly working as part of the maintainer team, read and follow @CONTRIBUTING.md. That public contribution guide replaces the Maintainer Workflow in @CLAUDE.md. Do not create an issue or install the maintainer harness; make the change and raise a pull request whose description is the specification.

For planning, discovery, PRD, architecture, delivery planning, or future-project discussion, also read and follow @project-memory/AGENTS.md.

For domain modelling or architecture questions, start with the generated current model at @docs/architecture/ddd/domain-guide.md. Use it to locate the relevant subdomains, aggregates, use cases, and operations, then inspect their code and tests before drawing conclusions.

Domain model code must not use the TypeScript `in` operator. This includes using `in` to distinguish union members, such as `'fromClassName' in rule`. Model these values as explicit discriminated unions and match them exhaustively instead.

Always strive for exhaustive type safety. Match closed unions exhaustively, and make the compiler reject every new, removed, or renamed member until all consumers handle the change. Never duplicate published language member names in unchecked string literals.

Coverage workarounds are forbidden without explicit user approval. This includes coverage ignore directives, coverage exclusions, reduced coverage thresholds, and unreachable branches added only to satisfy coverage tooling. Cover real behaviour with tests or restructure the code so the unreachable branch does not exist.

When running the Codex workflow command in a non-interactive shell, set `CI=true`. The workflow command runs pnpm dependency checks, and pnpm otherwise tries to remove `node_modules` through a TTY prompt. In the Codex sandbox, use external execution permission if `tsx` cannot create its temporary IPC socket.
