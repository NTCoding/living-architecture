# command-input-factory

## Purpose
A function that translates raw external input (CLI options, HTTP request body) into a typed command-use-case-input.

## Behavioral Contract
1. Accept raw/untyped external data (CLI options object, parsed request body)
2. Validate, transform, and assemble into a typed command-use-case-input
3. Return the typed input — never invoke the command itself

## Examples

### Canonical Example
```typescript
/** @riviere-role command-input-factory */
export function createExtractDraftComponentsInput(
  options: CliExtractOptions,
  resolvedConfig: ResolvedConfig,
): ExtractDraftComponentsInput {
  return {
    configPath: resolvedConfig.configPath,
    sourceMode: options.pullRequest ? 'pull-request' : 'full-project',
    allowIncomplete: options.allowIncomplete ?? false,
    includeConnections: options.includeConnections ?? true,
    baseBranch: options.baseBranch,
  }
}
```

## Anti-Patterns

### Common Misclassifications
- **Not a command-use-case**: factories do not load aggregates or invoke domain behavior
- **Not a cli-entrypoint**: entrypoints wire up the full CLI command (register with Commander, call factory, call command, format output). Factories only build the input.

### Mixed Responsibility Signals
- If the factory also calls the command use case — that's entrypoint behavior leaking in
- If the factory does complex domain logic to build the input — some logic may belong in a domain-service

## Decision Guidance
- **vs cli-entrypoint**: Does it register CLI commands or call the use case? → cli-entrypoint. Does it only build the input object? → command-input-factory
