# cli-error

## Purpose
An error type, error class, or error code enum that represents failure modes at the CLI boundary — not from external services and not from the domain.

## Behavioral Contract
1. Defines the set of named error codes or exit codes for the CLI layer
2. May be an enum of error code strings, an exit code enum, or an error class wrapping a CliErrorCode
3. Is thrown or returned at the CLI layer when a command fails due to configuration, validation, or runtime errors
4. Does NOT represent failures from external tools (those are `external-client-error`)
5. Does NOT represent domain rule violations (which would be domain errors)

## Examples

### Canonical Example — Error Code Enum
```typescript
/** @riviere-role cli-error */
export enum CliErrorCode {
  GraphNotFound = 'GRAPH_NOT_FOUND',
  ComponentNotFound = 'COMPONENT_NOT_FOUND',
  ValidationError = 'VALIDATION_ERROR',
}
```

### Canonical Example — Exit Code Enum
```typescript
/** @riviere-role cli-error */
export enum ExitCode {
  ExtractionFailure = 1,
  ConfigValidation = 2,
  RuntimeError = 3,
}
```

### Canonical Example — Error Class
```typescript
/** @riviere-role cli-error */
export class ConfigValidationError extends Error {
  readonly errorCode: CliErrorCode
  constructor(code: CliErrorCode, message: string) {
    super(message)
    this.name = 'ConfigValidationError'
    this.errorCode = code
  }
}
```

## Anti-Patterns

### Common Misclassifications
- **Not an external-client-error**: external-client-error is for failures from external tools (git, HTTP, file system libraries). cli-error is for failures caused by invalid CLI usage or configuration.
- **Not a value-object**: error codes and error classes are not domain concepts; they are CLI infrastructure concerns.

### Mixed Responsibility Signals
- If the error class contains retry logic or recovery behavior — that belongs in a handler, not the error type

## Decision Guidance
- Is the error caused by an external tool/library (git, HTTP, file system)? → external-client-error
- Is the error caused by a domain rule violation? → domain error (may need a separate role)
- Is the error a named code for invalid CLI usage, bad configuration, or CLI-layer runtime failure? → cli-error
