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
- `commands/` → domain and data access; never concrete domain-port adapters
- `queries/` → query models and data access
- `domain/` → domain code and domain ports only; never adapters or infrastructure
- `data-access/` → reconstructs aggregates or query models from persisted data
- `adapters/` → one domain port and one generic client API; never external packages directly
- `infra/` → external packages and generic technical capabilities whose APIs use only language primitives or external-system types; never application-owned code from entrypoint, commands, queries, domain, data access, adapters, or shell
- `shell/` → constructs concrete dependencies and passes them into entrypoints

Concrete test: `readJsonFile(filePath): unknown` and `resolveFileOrPackagePath(...): string` qualify because their contracts contain only primitives and external technical concepts. `loadDraftComponentsFromFile(filePath): DraftComponent[]` does not qualify because its contract and validation use an application-owned type. See the [full extraction repository example](../../project-memory/architecture/memories/prefer-layer-based-rules.md).

## Automated Enforcement

Role enforcement is automated via an oxlint plugin. It checks annotations, location constraints, dependency rules, and I/O contracts at lint time. The enforcement config at `.riviere/role-enforcement.config.ts` is the source of truth for what's enforced. The separation-of-concerns skill defines the architectural principles; role enforcement automates their verification.

Import rules belong directly to their `location(...)` or `subLocation(...)` definitions. Imports within the same configured location are allowed normally. A location may restrict imports crossing its boundary to specific target roles or forbid direct external-package imports. Role-specific exceptions, such as command-to-command and adapter-to-adapter imports, use the existing role `forbiddenDependencies` rule. RLE must not maintain a second list of path matchers for architectural layers.

## Classification Decision Tree

When classifying a declaration:
1. What layer does the file path map to? Check allowed roles for that layer.
2. Does the declaration name match a `nameMatches` pattern? (e.g., `.*Input$` → command-use-case-input)
3. What is the declaration type (function, class, interface)? Filter to roles allowing that target.
4. Read the behavioral contract in the matching role definition file.
5. Ask the ownership question: is this a real domain concept, or is it only mapping domain results into the API of a specific consumer such as a CLI presenter, workflow updater, or builder?
6. If ambiguous, check Decision Guidance sections for tie-breaking criteria.
7. If no existing role fits, flag for human review before proposing a new role.
