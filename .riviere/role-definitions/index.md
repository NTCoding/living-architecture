# Role Definitions

## Architecture Resources

These resources inform how roles are classified and where code should live:

- [ADR-002: Allowed Folder Structures](../../docs/architecture/adr/ADR-002-allowed-folder-structures.md) — Canonical directory layout
- [Role enforcement configuration](../role-enforcement.config.ts) — Executable location, dependency, and role rules
- [Architecture memory](../../project-memory/architecture/README.md) — Approved local architecture decisions and examples
- [Software Design Conventions](../../docs/conventions/software-design.md) — SD-001 through SD-023

## Dependency Rules

Dependencies point inward:
- `entrypoint/` → commands, queries, and shared `platform/domain`; never feature domain or data access directly
- `commands/` → domain and data access; never concrete domain-port adapters
- `queries/` → query models and data access
- `domain/` → domain code and domain ports only; never adapters or infrastructure
- `data-access/` → reconstructs aggregates or query models from persisted data
- `adapters/` → one domain port and one generic client API; never external packages directly
- `infra/` → external packages and generic technical capabilities whose APIs use only language primitives or external-system types; never application-owned code from entrypoint, commands, queries, domain, data access, adapters, or shell
- `shell/` → constructs concrete dependencies and passes them into entrypoints

Concrete test: `readJsonFile(filePath): unknown` and `resolveFileOrPackagePath(...): string` qualify because their contracts contain only primitives and external technical concepts. `loadDraftComponentsFromFile(filePath): DraftComponent[]` does not qualify because its contract and validation use an application-owned type. See the [full extraction repository example](../../project-memory/architecture/memories/prefer-layer-based-rules.md).

## Automated Enforcement

Role enforcement is automated via an oxlint plugin. It checks annotations, location constraints, dependency rules, and I/O contracts at lint time. ADR-002 defines the architecture and `.riviere/role-enforcement.config.ts` is its executable form. Changes must update both.

Import rules belong in the relevant location's `rules.dependencyRules`. Parent restrictions apply throughout the location subtree. Imports are unrestricted unless a location declares dependency rules. `subLocations` is the complete list of permitted folders unless `allowAnySubLocations` is set. Role-specific restrictions use the existing role `forbiddenDependencies` rule. RLE must not maintain a second list of path matchers for architectural locations.

## Classification Decision Tree

When classifying a declaration:
1. What layer does the file path map to? Check allowed roles for that layer.
2. Does the declaration name match a `nameMatches` pattern? (e.g., `.*Input$` → command-use-case-input)
3. What is the declaration type (function, class, interface)? Filter to roles allowing that target.
4. Read the behavioral contract in the matching role definition file.
5. Ask the ownership question: is this a real domain concept, or is it only mapping domain results into the API of a specific consumer such as a CLI presenter, workflow updater, or builder?
6. If ambiguous, check Decision Guidance sections for tie-breaking criteria.
7. If no existing role fits, flag for human review before proposing a new role.
