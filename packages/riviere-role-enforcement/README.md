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

## Repo command

From the workspace root:

```bash
pnpm role-enforcement:check -- --config path/to/riviere-role-enforcement.yaml
```

- omit file paths to check the default full repository roots: `packages`, `tools`, and `apps`
- append file paths to check only changed files for local development or CI

Examples:

```bash
pnpm role-enforcement:check -- --config packages/riviere-role-enforcement/fixtures/oxlint-spike/riviere-role-enforcement.yaml
pnpm role-enforcement:check -- --config packages/riviere-role-enforcement/fixtures/oxlint-spike/riviere-role-enforcement.yaml packages/riviere-role-enforcement/fixtures/oxlint-spike/src/shell/cli.ts
```

## Spike command

From the workspace root:

```bash
pnpm role-enforcement:spike
```
