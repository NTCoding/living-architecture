# command-use-case-input

## Purpose
A type that defines the single input contract for a command-use-case function.

## Behavioral Contract
This is a data structure, not behavior. It:
1. Defines all parameters a command-use-case needs to execute
2. Is the ONLY parameter type accepted by its corresponding command-use-case
3. Contains domain-relevant data, NOT raw external input (no CLI option objects, no HTTP request bodies)

## Examples

### Canonical Example
```typescript
/** @riviere-role command-use-case-input */
export interface ExtractDraftComponentsInput {
  configPath: string
  sourceMode: 'full-project' | 'pull-request'
  allowIncomplete: boolean
  includeConnections: boolean
  baseBranch?: string
}
```

### Edge Cases
- A type alias is valid: `export type FooInput = { ... }`
- Can contain optional fields for optional behavior variations
- Can reference value objects or other domain types as field types

## Anti-Patterns

### Common Misclassifications
- **Not a value-object**: value objects represent domain concepts with equality semantics. Inputs are structural contracts for a specific command.
- **Not an external-client-model**: external client models represent data shapes from third-party APIs.

### Mixed Responsibility Signals
- If the input contains fields that only make sense for output formatting — those belong in a separate concern
- If the input directly mirrors CLI flags with their raw types — a command-input-factory should translate
- If the input contains nested objects that are themselves inputs for sub-commands — the command may need splitting

## Decision Guidance
- **vs value-object**: Is it specifically the parameter for a command-use-case function? → command-use-case-input. Is it a reusable domain concept? → value-object
- **vs external-client-model**: Does it define what a command needs? → command-use-case-input. Does it define what an external service returns? → external-client-model
