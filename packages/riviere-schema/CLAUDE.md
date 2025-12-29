# riviere-schema

Riviere JSON schema definition and validation utilities.

## Commit Conventions

**Use `fix(riviere-schema):` for most changes.** This results in a patch version bump.

Only use `feat(riviere-schema):` when the schema specification itself changes (new fields, new component types, structural changes). This bumps the minor version.

| Change type | Commit prefix | Version bump |
|-------------|---------------|--------------|
| Validation code, utilities, tests | `fix(riviere-schema):` | patch (0.1.0 → 0.1.1) |
| New schema field or type | `feat(riviere-schema):` | minor (0.1.0 → 0.2.0) |
| Breaking schema change | `feat(riviere-schema)!:` | major (0.1.0 → 1.0.0) |

## Version Synchronization

**The schema version and npm package version must stay in sync.**

- `package.json` version: `0.1.0`
- Schema version in example graphs: `"version": "0.1"`

When the npm version bumps to a new minor (e.g., `0.2.0`):
1. Update all example graphs in `examples/` to match (e.g., `"version": "0.2"`)

The schema version uses major.minor format (no patch), while npm uses semver (major.minor.patch). Patch bumps to npm don't require schema version updates.
