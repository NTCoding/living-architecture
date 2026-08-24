# AGENTS.md

Read and follow all instructions in @CLAUDE.md

If you are not explicitly working as part of the maintainer team, read and follow @CONTRIBUTING.md. That public contribution guide replaces the Maintainer Workflow in @CLAUDE.md. Do not create an issue or install the maintainer harness; make the change and raise a pull request whose description is the specification.

For planning, discovery, PRD, architecture, delivery planning, or future-project discussion, also read and follow @project-memory/AGENTS.md.

For domain modelling or architecture questions, start with the generated current model at @docs/architecture/ddd/domain-guide.md. Use it to locate the relevant subdomains, aggregates, use cases, and operations, then inspect their code and tests before drawing conclusions.

When running the Codex workflow command in a non-interactive shell, set `CI=true`. The workflow command runs pnpm dependency checks, and pnpm otherwise tries to remove `node_modules` through a TTY prompt. In the Codex sandbox, use external execution permission if `tsx` cannot create its temporary IPC socket.
