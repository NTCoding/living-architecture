# Contributing to Living Architecture

This is the public workflow for external contributors. Members of the maintainer team use the separate [`maintainer workflow`](docs/workflow/task-workflow.md).

## How to Contribute

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Run the relevant tests and `pnpm verify`
5. Submit a pull request with a detailed description

External contributors do not create a GitHub issue or install the maintainer harness. The pull request description is the specification for the change: it must explain the problem, the proposed outcome, the concrete changes, the acceptance criteria and how the result was validated.

This workflow is deliberately independent of Claude Code, Codex, OpenCode, Kimi, Hermes or any other agent harness.

## Development Setup

```bash
pnpm install
nx run-many -t build    # Verify setup works
```

## Commands

```bash
pnpm nx run-many -t build              # Build all
pnpm nx run-many -t test               # Test all
pnpm nx run-many -t lint               # Lint all
pnpm verify                            # Full verification
```

Single project:
```bash
nx build [project-name]
nx test [project-name]
```

## Commit Messages

Use [conventional commits](https://www.conventionalcommits.org/):

```text
feat: add new query function
fix: handle empty input gracefully
docs: update API reference
refactor: simplify validation logic
test: add edge case coverage
chore: update dependencies
```

## Code Standards

Follow the conventions in [`docs/conventions/`](docs/conventions/):
- [`software-design.md`](docs/conventions/software-design.md) — Design principles
- [`testing.md`](docs/conventions/testing.md) — Testing requirements
- Code placement follows the [`development-skills:separation-of-concerns`](https://github.com/NTCoding/claude-skillz/blob/main/separation-of-concerns/SKILL.md) skill

## Testing Requirements

100% test coverage is mandatory. All commits must pass:

```bash
pnpm verify
```

## Optional Agent Reviews

If your harness supports agents, you can run these against your changes:

- [`architecture-review`](tools/dev-workflow-v2/agents/architecture-review.md)
- [`code-review`](tools/dev-workflow-v2/agents/code-review.md)
- [`bug-scanner`](tools/dev-workflow-v2/agents/bug-scanner.md)

## Pull Request Process

1. Ensure `pnpm run verify` passes locally
2. Complete the pull request template in enough detail for maintainers to assess the change without a separate issue
3. Address review feedback

## Contribution Workflows

External contributors use this lightweight public workflow: make the change and raise a detailed pull request.

Members of the maintainer team use the full [`maintainer workflow`](docs/workflow/task-workflow.md), including planning, GitHub issues and the development harness.

## AI-Assisted Development

This project was built with [Claude Code](https://claude.com/claude-code) with skills from [claude-skillz](https://github.com/NTCoding/claude-skillz).
