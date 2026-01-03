# Contributing to Living Architecture

## How to Contribute

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Submit a pull request

## Development Setup

```bash
pnpm install
nx run-many -t build    # Verify setup works
```

## Commands

```bash
nx run-many -t build              # Build all
nx run-many -t test               # Test all
nx run-many -t lint               # Lint all
nx run-many -t lint,typecheck,test --coverage   # Full verification
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
- [`codebase-structure.md`](docs/conventions/codebase-structure.md) — Project organization

## Testing Requirements

100% test coverage is mandatory. All commits must pass:

```bash
nx run-many -t lint,typecheck,test --coverage
```

## Pull Request Process

1. Ensure `pnpm run verify` passes locally
2. Write clear PR description
3. Address review feedback

## Task Workflow

For task management, see [`docs/workflow/task-workflow.md`](docs/workflow/task-workflow.md).

## AI-Assisted Development

This project was built with [Claude Code](https://claude.com/claude-code) with skills from [claude-skillz](https://github.com/NTCoding/claude-skillz).
