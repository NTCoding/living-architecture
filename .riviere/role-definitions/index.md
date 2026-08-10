# Role Definitions

## Architecture Resources

These resources inform how roles are classified and where code should live:

- [Separation of Concerns Skill](https://github.com/NTCoding/claude-skillz/blob/main/separation-of-concerns/SKILL.md) — Code placement decision tree (Q1-Q7): wiring → entrypoint → commands → queries → domain → infra
- [Tactical DDD Skill](https://github.com/NTCoding/claude-skillz/blob/main/tactical-ddd/SKILL.md) — Aggregate design, value objects, domain services, repositories
- [ADR-002: Allowed Folder Structures](../../docs/architecture/adr/ADR-002-allowed-folder-structures.md) — Canonical directory layout
- [Software Design Conventions](../../docs/conventions/software-design.md) — SD-001 through SD-023

## Dependency Rules

Dependencies point inward:
- `entrypoint/` → commands and queries; never domain or data access directly
- `commands/` → domain and data access
- `queries/` → query models and data access
- `domain/` → domain code and domain ports only; never adapters or infrastructure
- `data-access/` → reconstructs aggregates or query models from persisted data
- `adapters/` → one domain port and one generic client API; never external packages directly
- `infra/` → infra and external packages only; never entrypoint, use-case, domain, or data access
- `shell/` → constructs concrete dependencies and passes them into entrypoints

## Automated Enforcement

Role enforcement is automated via an oxlint plugin. It checks annotations, location constraints, dependency rules, and I/O contracts at lint time. The enforcement config at `.riviere/role-enforcement.config.ts` is the source of truth for what's enforced. The separation-of-concerns skill defines the architectural principles; role enforcement automates their verification.

## Classification Decision Tree

When classifying a declaration:
1. What layer does the file path map to? Check allowed roles for that layer.
2. Does the declaration name match a `nameMatches` pattern? (e.g., `.*Input$` → command-use-case-input)
3. What is the declaration type (function, class, interface)? Filter to roles allowing that target.
4. Read the behavioral contract in the matching role definition file.
5. Ask the ownership question: is this a real domain concept, or is it only mapping domain results into the API of a specific consumer such as a CLI presenter, workflow updater, or builder?
6. If ambiguous, check Decision Guidance sections for tie-breaking criteria.
7. If no existing role fits, flag for human review before proposing a new role.
