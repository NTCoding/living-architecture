# Role Definitions

## Architecture Resources

These resources inform how roles are classified and where code should live:

- [ADR-002: Allowed Folder Structures](../../docs/architecture/adr/ADR-002-allowed-folder-structures.md) — Canonical directory layout
- [Role enforcement configuration](../role-enforcement.config.ts) — Executable location, dependency, and role rules
- [Architecture memory](../../project-memory/architecture/README.md) — Approved local architecture decisions and examples
- [Software Design Conventions](../../docs/conventions/software-design.md) — SD-001 through SD-023

## Dependency Rules

Dependencies point inward:

- App `entrypoint/` → subdomain commands and queries plus app `infra/`; never domain or data access directly
- Use-case `commands/` → own-subdomain domain and feature data access; never concrete domain-port adapters
- Use-case `queries/` → own-subdomain domain and feature data access
- Domain-model `domain/` → its own model and permitted published languages; never use cases, adapters, infra, apps, or another domain model
- Use-case `data-access/{concept}/` → aggregate and value-object roles from its own domain plus generic clients; never domain services
- Use-case `adapters/{adapter}/` → domain ports from its own subdomain plus generic client APIs; never external packages directly
- Root `infra/` → external packages and generic technical capabilities; never app, use-case, or domain declarations
- App `shell/` → constructs concrete dependencies and passes them into entrypoints

Concrete test: `readJsonFile(filePath): unknown` and `resolveFileOrPackagePath(...): string` qualify because their contracts contain only primitives and external technical concepts. `loadDraftComponentsFromFile(filePath): DraftComponent[]` does not qualify because its contract and validation use an application-owned type.

## Automated Enforcement

Rivière role enforcement is automated via an Oxlint plugin. It checks annotations, location constraints, import rules, and input/output contracts at lint time. ADR-002 defines the architecture and `.riviere/role-enforcement.config.ts` is its executable form. Changes must update both.

Import rules belong in the relevant location's `importRules`. Imports are unrestricted until a location declares import rules. That location can then import only its own subtree, inherited imports, and locations listed in `allow`. `sibling` means the same concrete parent location; `root` means the same package root; `ownSubdomain` and `anySubdomain` use the configured `{subdomain}` path capture. Allowing a location allows everything inside it unless a role subset is supplied. Explicit sublocations are the complete list of permitted folders unless `allowAnySubLocations` is set.

The enforcer checks static imports, re-exports, dynamic imports, CommonJS `require()` calls and TypeScript import types. Non-literal dynamic imports and `require()` calls are rejected because their target cannot be checked. Production code cannot import ignored fixture files. Test files are deliberately exempt from production import rules so tests can assemble fixtures across boundaries.

Some behavioural guidance is intentionally reviewed rather than mechanically counted. For example, an adapter should stay focused on one port-to-client translation and a CLI entrypoint should invoke one use case. The executable rules enforce the permitted locations and roles; review checks whether a particular declaration remains cohesive.

## Classification Decision Tree

When classifying a declaration:
1. What layer does the file path map to? Check allowed roles for that layer.
2. Does the declaration name match a `nameMatches` pattern? (e.g., `.*Input$` → command-use-case-input)
3. What is the declaration type (function, class, interface)? Filter to roles allowing that target.
4. Read the behavioral contract in the matching role definition file.
5. Ask the ownership question: is this a real domain concept, or is it only mapping domain results into the API of a specific consumer such as a CLI presenter, workflow updater, or builder?
6. If ambiguous, check Decision Guidance sections for tie-breaking criteria.
7. If no existing role fits, flag for human review before proposing a new role.
