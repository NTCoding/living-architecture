# riviere-role-enforcement

Spike package for deterministic repository role enforcement.

## Current spike scope

- load a minimal YAML role config
- read explicit `@riviere-role` assignment from exported classes and standalone functions
- validate each assigned role instead of inferring it
- enforce allowed location, naming, and allowed public methods
- expose an Oxlint JS plugin for end-to-end validation

Example assignment:

```ts
/** @riviere-role cli-shell */
export function createProgram(): string {
  return 'ok'
}
```

## Spike command

From the workspace root:

```bash
pnpm role-enforcement:spike
```
