# cli-entrypoint

## Purpose
A function that wires a CLI command: registers it with the CLI framework, translates user input, invokes a command-use-case, and formats output.

## Behavioral Contract
1. **Register** — define the CLI command, its flags, and description using the CLI framework (e.g., Commander)
2. **Translate** — convert CLI options into a command-use-case-input (often via a command-input-factory)
3. **Invoke** — call the command-use-case with the typed input
4. **Format** — pass the result to a cli-output-formatter for display

This is the thinnest possible layer between the external world and the domain.

## Examples

### Canonical Example
```typescript
/** @riviere-role cli-entrypoint */
export function createExtractCommand(): Command {
  return new Command('extract')
    .description('Extract components from source code')
    .option('--config <path>', 'Config file path')
    .action(async (options) => {
      const input = createExtractDraftComponentsInput(options)
      const result = extractDraftComponents(input)
      presentExtractionResult(result)
    })
}
```

## Anti-Patterns

### Common Misclassifications
- **Not a command-use-case**: entrypoints do not load aggregates or contain domain logic
- **Not a cli-output-formatter**: entrypoints call formatters but do not contain formatting logic

### Mixed Responsibility Signals
- If the entrypoint constructs complex objects or does validation beyond basic CLI parsing — factory or command logic leaking in
- If the entrypoint calls multiple command use cases in sequence — composition should be in a single command or separate CLI commands
- If the entrypoint directly accesses repositories or datastores — command-use-case responsibility leaking in

## Decision Guidance
- **vs command-use-case**: Does it know about the CLI framework? → cli-entrypoint. Does it accept typed input and orchestrate domain behavior? → command-use-case
- **vs command-input-factory**: Does it register CLI commands? → cli-entrypoint. Does it only transform options into input? → command-input-factory
