# Role Definitions

## Architecture Resources

These resources inform how roles are classified and where code should live:

- [Separation of Concerns Skill](https://github.com/NTCoding/claude-skillz/blob/main/separation-of-concerns/SKILL.md) — Code placement decision tree (Q1-Q7): wiring → entrypoint → commands → queries → domain → infra
- [Tactical DDD Skill](https://github.com/NTCoding/claude-skillz/blob/main/tactical-ddd/SKILL.md) — Aggregate design, value objects, domain services, repositories
- [ADR-002: Allowed Folder Structures](../../docs/architecture/adr/ADR-002-allowed-folder-structures.md) — Canonical directory layout
- [Software Design Conventions](../../docs/conventions/software-design.md) — SD-001 through SD-023

## Dependency Rules

Dependencies point inward:
- `entrypoint/` → commands, queries, own feature infra, platform infra
- `commands/` → domain, platform infra, platform domain, own feature infra
- `domain/` → platform domain ONLY (no infra)
- `infra/` → external libraries, platform infra

## Automated Enforcement

Role enforcement is automated via an oxlint plugin. It checks annotations, location constraints, dependency rules, and I/O contracts at lint time. The enforcement config at `.riviere/role-enforcement.config.ts` is the source of truth for what's enforced. The separation-of-concerns skill defines the architectural principles; role enforcement automates their verification.

## Classification Decision Tree

When classifying a declaration:
1. What layer does the file path map to? Check allowed roles for that layer.
2. Does the declaration name match a `nameMatches` pattern? (e.g., `.*Input$` → command-use-case-input)
3. What is the declaration type (function, class, interface)? Filter to roles allowing that target.
4. Read the behavioral contract in the matching role definition file.
5. If ambiguous, check Decision Guidance sections for tie-breaking criteria.
6. If no existing role fits, flag for human review before proposing a new role.
