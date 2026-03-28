# value-object

## Purpose
A type or class that represents a domain concept defined by its attributes rather than identity — it carries meaning but no behavior that modifies external state.

## Behavioral Contract
1. Defined by its values, not by an identity
2. Typically immutable
3. May have derived/computed properties but no side effects
4. Used as building blocks within aggregates, inputs, and results

## Examples

### Canonical Example
```typescript
/** @riviere-role value-object */
export interface ModuleContext {
  moduleName: string
  sourceFiles: SourceFile[]
  tsConfigPath: string
}
```

### Edge Cases
- Discriminated unions are value objects: `type Outcome = 'success' | 'partial' | 'failure'`
- Enum-like const objects can be value objects
- A class with only getters and no mutation methods is a value object

## Anti-Patterns

### Common Misclassifications
- **Not an aggregate**: if it owns behavior that enforces invariants and is loaded through a repository, it's an aggregate
- **Not a command-use-case-input**: if it's specifically the parameter type for a command, use that more specific role
- **Not an external-client-model**: if it represents an external service's data shape rather than a domain concept

### Mixed Responsibility Signals
- If the type contains methods that call external services — likely an aggregate or misplaced infrastructure
- If the type is only used as a function parameter for one command — consider command-use-case-input instead

## Decision Guidance
- **vs aggregate**: Does it own behavior and enforce invariants? → aggregate. Is it a data structure? → value-object
- **vs command-use-case-input**: Is it the specific input for one command? → command-use-case-input. Is it reused across multiple contexts? → value-object
- **vs external-client-model**: Does it represent a domain concept? → value-object. Does it represent an external API shape? → external-client-model
