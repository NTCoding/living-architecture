---
status: approved
dateAdded: 2026-08-10
systemAreas:
  - global
architectureConcepts:
  - boundary-placement
  - project-conventions
source: conversation: entrypoint migration and enforcement rules
---

# Prefer layer-based rules

## Memory

`entrypoint` is a layer. Things only used inside this layer stay inside this layer.

By keeping things in well-defined layers, we can create layer-based rules instead of ad hoc role-based rules.

Strive for layer-based rules. Resort to role-based rules only when it is not possible to express the constraint as a layer-based rule.

A `_platform` folder is a private internal package within its containing layer. Code anywhere inside that containing layer may use its `_platform`; code outside the containing layer may not import it. This convention applies to `_platform` folders in any layer.

Prefer a small number of broad, target-based layer rules with minimal configuration. Do not replace a layer boundary with lists of projects, locations, roles, or forbidden dependencies when one generic layer rule can express it.

A layer import rule is a location rule. Define it in the owning location's `importRules`. Do not create a separate collection of path matchers that classifies the same files again. Source and target locations must both be resolved from the configured location tree, otherwise role placement and import enforcement can drift apart.

For example, generic infrastructure is defined once as the parent location of its more specific role locations:

```ts
location<RoleName>('/platform').subLocation(
  location<RoleName>('/infra', [], {
    importRules: { allow: [] },
  })
    .subLocation('/external-clients/{client}', externalClientRoles)
    .subLocation(
      location<RoleName>('/cli', []).subLocation('/input', ['generic-cli-input-parser']),
    ),
)
```

The `infra` location owns the import rule directly. Imports within that location, including its sublocations, are allowed normally. `allow: []` says that infra cannot import another internal location; external packages remain allowed. Its sublocations refine role placement without redefining the infra path in a second rule system. A repeated path matcher or separate layer-rule collection is invalid because it duplicates information already expressed by the location hierarchy.

A file-size limit is not an architectural role. Do not create helper/component roles, unannotated-export exemptions, barrel-based privacy, or `_platform` folders solely to split a large file. First extract genuinely generic technical capabilities into infra, then re-evaluate the remaining code against the actual lint limit. If it fits, keep it inside the existing role. If it does not, identify the genuinely separate responsibilities and give each a real role.

The `ExtractionProjectRepository` refactor is the canonical example. See commit [`2474599b` — refactor: enforce architecture layer boundaries](https://github.com/NTCoding/living-architecture/commit/2474599b591df037d5e3e5d665e171db65f459a0) for the complete change.

All paths below are repository-relative. Before that commit, extraction-specific loaders lived under `packages/riviere-cli/src/features/extract/infra/external-clients/`. The refactor did not preserve those false abstractions. It deleted:

- `packages/riviere-cli/src/features/extract/infra/external-clients/draft-components/draft-component-loader.ts`
- `packages/riviere-cli/src/features/extract/infra/external-clients/extraction-config/load-extended-module.ts`

It moved the aggregate repository from `packages/riviere-cli/src/features/extract/infra/persistence/extraction-project/extraction-project-repository.ts` to `packages/riviere-cli/src/features/extract/data-access/extraction-project/extraction-project-repository.ts`. The repository reconstructs an `ExtractionProject`, so it is data access, not generic infra.

Only the following concrete, domain-ignorant functions were extracted to generic infra:

```ts
// packages/riviere-cli/src/platform/infra/external-clients/filesystem/file-reader.ts
readTextFile(filePath: string): string
readJsonFile(filePath: string, description = 'File'): unknown

// packages/riviere-cli/src/platform/infra/external-clients/node-modules/node-module-file-resolver.ts
resolveFileOrPackagePath(params: {
  baseDirectory: string
  packageRelativePath: string
  source: string
}): string
```

These functions accept paths and strings, return strings or `unknown`, and know only filesystem, JSON, and Node-module resolution. They do not import or name any extraction, repository, use-case, domain, or entrypoint type.

The application meaning stays in the repository. This real code remains in `packages/riviere-cli/src/features/extract/data-access/extraction-project/extraction-project-repository.ts`:

```ts
private loadDraftComponentsFromFile(filePath: string): DraftComponent[] {
  const parsed = readJsonFile(filePath, 'Enrich file')
  if (!this.isDraftComponentArray(parsed)) {
    throw new FileReadError(
      `Enrich file does not contain valid draft components: ${filePath}`,
    )
  }
  return parsed
}
```

`readJsonFile` belongs in infra because it parses a file to `unknown`. `loadDraftComponentsFromFile` does not belong in infra because it gives that file the application meaning `Enrich file`, validates `DraftComponent[]`, and returns domain-shaped data. Renaming the latter to a generic-sounding role would not make the dependency valid; the layer rule must reject it under `infra`.

The same boundary applies to package resolution. `resolveFileOrPackagePath` generically resolves a caller-supplied package-relative path. The repository's `loadExtendedModule` remains in data access because it:

- chooses the application convention `src/default-extraction.config.json`;
- recognises the supported extraction-config formats;
- validates `ExtractionConfig` and `Module` values;
- translates top-level rules into a partial `Module`;
- recursively resolves and merges extended module rules.

Do not move code to infra merely because some statements use the filesystem, paths, JSON, YAML, packages, or another technical API. The test is the concrete API and its imports. If extracted code imports or names `DraftComponent`, `Module`, `ExtractionConfig`, a use case, an aggregate, an entrypoint type, or a repository callback, it is not generic infrastructure and must remain in the application-owned layer. Infra APIs should expose only the external system's own concepts and language primitives, as `readJsonFile(...): unknown` and `resolveFileOrPackagePath(...): string` do above.

The canonical example is `_platform` privacy:

```text
privateInternalPackage('**/_platform', {
  scope: 'parent-layer',
})
```

The rule derives the containing layer from the target path. It allows imports from within that layer and rejects imports from outside it. The same rule covers every `_platform` folder in every existing or future feature, package, and layer without further configuration.

## Why this matters

Layer-based rules preserve clear dependency direction and apply consistently without enumerating individual roles or projects.

Broad rules also reduce maintenance and prevent enforcement gaps when new roles, features, layers, or packages are added.

## Consider this when

- Placing code used by one or more entrypoints.
- Defining architecture enforcement rules.
- Deciding whether shared code should move to another layer.
- Sharing private implementation within a layer without exposing it to other layers.

## Do not apply automatically when

- The responsibility genuinely belongs to another established layer.

## Clarify with the user when

- A constraint cannot be expressed as a layer-based rule.

## Related references

- `docs/architecture/adr/ADR-002-allowed-folder-structures.md`
