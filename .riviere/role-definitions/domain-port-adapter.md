# domain-port-adapter

## Purpose

A narrow implementation of one domain port using one generic external-client API.

## Rules

1. Implements a cohesive domain port.
2. Translates the port input into the external-client input.
3. Invokes the generic external-client API needed for that translation.
4. Translates the external-client result or error into the port result or error.
5. Contains no domain decisions, application orchestration, or direct infrastructure calls.
6. Lives in `adapters/{adapter}/`.
7. Does not import another `domain-port-adapter`.

## Canonical Example

This is not a universal claim that adapters never import technology. In this architecture, a `domain-port-adapter` and a generic external client are deliberately separate roles:

- The domain-port adapter translates between the domain-owned port and the project-controlled external-client API.
- The external client implements the external interaction using Node APIs, a CLI, an SDK, or another third-party package.

Allowing the domain-port adapter to import those implementation dependencies would collapse the two roles back together. It could bypass the external-client contract, mix domain translation with I/O and external response parsing, and scatter one tool's implementation across feature adapters.

The real Oxlint implementation added in commit [`2474599b`](https://github.com/NTCoding/living-architecture/commit/2474599b591df037d5e3e5d665e171db65f459a0) demonstrates the boundary.

```typescript
// packages/riviere-role-enforcement/use-cases/src/features/enforcement/adapters/oxlint/
// oxlint-role-enforcement-runner.ts
export function createOxlintRoleEnforcementRunner(
  oxlintClient: OxlintClient,
  pluginPath: string | undefined,
): RoleEnforcementRunner {
  return (input) => {
    if (pluginPath === undefined) {
      return failure('Cannot find role-enforcement-plugin.mjs')
    }

    try {
      return oxlintClient({
        config: createOxlintConfig(input.config, input.configDir, pluginPath),
        configDir: input.configDir,
        lintTargets: input.lintTargets,
      })
    } catch (error) {
      if (error instanceof OxlintExecutionError) return failure(error.message)
      throw error
    }
  }
}
```

That adapter knows both contracts: `RoleEnforcementRunnerInput` from the domain port and `OxlintConfig` from the generic Oxlint client. It owns their translation and maps `OxlintExecutionError` into the port's failure result. It does not know how Oxlint is installed or executed.

The external mechanics live in `packages/riviere-role-enforcement/use-cases/src/infra/external-clients/oxlint/oxlint-client.ts`. That file imports `node:child_process`, `node:fs`, `node:path`, and `node:url`; locates the Oxlint binary; writes the temporary configuration; spawns Oxlint; captures its streams and exit status; and removes the temporary file. It accepts only `OxlintConfig` and primitive paths, so it knows nothing about role-enforcement domain types.

Putting the following code in `oxlint-role-enforcement-runner.ts` would be the violation:

```typescript
// Wrong: this domain-port adapter is also implementing the Oxlint client.
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function createOxlintRoleEnforcementRunner(
  pluginPath: string,
): RoleEnforcementRunner {
  return input => {
    const configPath = resolve(input.configDir, '.oxlintrc.role-enforcement.json')
    writeFileSync(
      configPath,
      JSON.stringify(createOxlintConfig(input.config, input.configDir, pluginPath)),
    )
    const result = spawnSync('oxlint', ['-c', configPath, ...input.lintTargets], {
      cwd: input.configDir,
      encoding: 'utf8',
    })
    return {
      exitCode: result.status ?? 1,
      stderr: result.stderr,
      stdout: result.stdout,
    }
  }
}
```

## Anti-Patterns

- Importing an aggregate or domain service directly.
- Importing Node APIs or third-party packages instead of using the external-client API.
- Importing another domain-port adapter instead of implementing its own single port-to-client translation.
- Coordinating multiple external clients.
- Implementing the external client itself.
