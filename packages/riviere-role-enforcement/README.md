# riviere-role-enforcement

Spike package for deterministic repository role enforcement.

## Current package scope

- load a minimal YAML role config
- read explicit `@riviere-role` assignment from classes, static methods, and standalone functions
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
pnpm role-enforcement:check
```

- this is the authoritative deterministic role-enforcement command for local use and CI
- with no extra paths, it checks the Phase 3 branch roots wired into the command
- append file paths after `--` to run a narrower changed-file probe locally without changing the default CI path

Examples:

```bash
pnpm role-enforcement:check
pnpm role-enforcement:check -- packages/riviere-cli/src/shell/cli.ts tools/dev-workflow-v2/src/infra/cli/git.ts
```

## Spike command

From the workspace root:

```bash
pnpm role-enforcement:spike
```
