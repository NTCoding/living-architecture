# riviere-role-enforcement

Spike package for deterministic repository role enforcement.

## Current spike scope

- load a minimal YAML role config
- enumerate exported classes and standalone functions
- match each target against role definitions
- enforce allowed location, naming, and allowed public methods
- expose an Oxlint JS plugin for end-to-end validation

## Spike command

From the workspace root:

```bash
pnpm role-enforcement:spike
```
