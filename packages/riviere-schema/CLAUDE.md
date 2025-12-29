# riviere-schema

Riviere JSON schema definition and validation utilities.

## Version Synchronization

**The schema version and npm package version must stay in sync.**

- `package.json` version: `0.1.0`
- Schema version in example graphs: `"version": "0.1"`

When bumping versions:
1. Update `package.json` version (e.g., `0.2.0`)
2. Update all example graphs in `examples/` to match (e.g., `"version": "0.2"`)

The schema version uses major.minor format (no patch), while npm uses semver (major.minor.patch).
