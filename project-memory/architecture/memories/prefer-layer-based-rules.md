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

A file-size limit is not an architectural role. Do not create helper/component roles, unannotated-export exemptions, barrel-based privacy, or `_platform` folders solely to split a large file. First extract genuinely generic technical capabilities into infra, then re-evaluate the remaining code against the actual lint limit. If it fits, keep it inside the existing role. If it does not, identify the genuinely separate responsibilities and give each a real role.

The `ExtractionProjectRepository` refactor is the canonical example. The repository exceeded the 400-line ESLint limit while also containing generic file and Node-module operations. Only these responsibilities moved to `platform/infra/external-clients/`:

- `filesystem`: checking file existence, reading UTF-8 text, parsing JSON to `unknown`, and reporting generic file-read failures.
- `node-modules`: resolving an installed package from a base directory and resolving a caller-supplied relative file within that package.

The following responsibilities remained in `data-access/extraction-project/extraction-project-repository.ts` because they contain extraction or repository meaning:

- Validating that parsed JSON represents `DraftComponent[]`.
- Giving a file the application meaning `Enrich file`.
- Choosing `src/default-extraction.config.json` as the package convention.
- Recognising supported extended extraction-config formats.
- Translating those formats into partial `Module` rules.
- Resolving nested extraction configuration and merging extended module rules.

Do not move code to infra merely because some statements use the file system, paths, JSON, YAML, packages, or another technical API. Infra must remain generic. If the extracted code imports or names `DraftComponent`, `Module`, `ExtractionConfig`, a use case, an aggregate, an entrypoint type, or a repository callback, it is not generic infrastructure and must remain in the application-owned layer.

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
