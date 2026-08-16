# cli-entrypoint-dependencies

## Purpose

The one dependency object accepted by a CLI entrypoint.

## Behavioural Contract

1. Is an interface whose name ends in `EntrypointDependencies`.
2. Contains the command use case and every callable dependency the entrypoint needs.
3. Is assembled by the composition root.
4. Contains no CLI options or command input values.

## Example

```typescript
/** @riviere-role cli-entrypoint-dependencies */
export interface LinkHttpEntrypointDependencies {
  readonly linkHttp: LinkHttp
  readonly formatError: typeof formatError
  readonly formatSuccess: typeof formatSuccess
  readonly getDefaultGraphPathDescription: () => string
}
```

## Anti-Patterns

- Giving a CLI entrypoint several dependencies as separate parameters.
- Directly invoking a statically imported function from a CLI entrypoint.
- Creating the dependency object inside the CLI entrypoint.
