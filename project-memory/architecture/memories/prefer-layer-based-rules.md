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
