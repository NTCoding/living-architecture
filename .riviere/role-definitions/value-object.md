# value-object

## Purpose
A class that represents a domain concept defined by its attributes rather than identity. It owns its construction from supplied values and may expose immutable behavior.

## Behavioral Contract
1. Defined by its values, not by an identity
2. Immutable: operations return new values instead of mutating the current value
3. Has at least one static factory method beginning with `parse` or `from`
4. Every `parse` or `from` factory accepts at least one parameter
5. Has a private constructor, so callers must use a factory method
6. May expose instance methods such as `equals`, `add`, or `toString`
7. Does not store functions in instance data members
8. Used as a building block within aggregates, inputs, and results

## Examples

### Canonical Example
```typescript
/** @riviere-role value-object */
export class Money {
  declare private readonly brand: 'Money'

  private constructor(readonly amount: number) {}

  static parse(amount: number): Money {
    return new Money(amount)
  }

  add(other: Money): Money {
    return Money.parse(this.amount + other.amount)
  }
}
```

### Edge Cases
- Multiple input representations may use methods such as `parseFromString` and `parseFromJson`
- Use `parse` when the method interprets or validates its input
- Use `from` when the method constructs the value object from already valid input
- Use a suffix when the class and parameter types do not make the source clear
- Zero-parameter `parse` and `from` methods are forbidden because they parse or construct from nothing
- Parsing may return a structured validation result when input can be invalid
- Ordinary instance methods are allowed; callable instance data members are not

## Anti-Patterns

### Common Misclassifications
- **Not an aggregate**: if it owns behavior that enforces invariants and is loaded through a repository, it's an aggregate
- **Not an interface or type alias**: value objects are classes that own parsing and immutable behavior
- **Not a command-use-case-input**: if it's specifically the parameter type for a command, use that more specific role
- **Not an external-client-model**: if it represents an external service's data shape rather than a domain concept
- **Not a consumer contract**: if it exists only to shape data for a builder, presenter, workflow, or CLI consumer, it is not a domain value object

### Mixed Responsibility Signals
- If the type contains methods that call external services — likely an aggregate or misplaced infrastructure
- If the type is only used as a function parameter for one command — consider command-use-case-input instead
- If the type is named around a specific consumer API rather than a domain concept — move it out of `domain/`

## Decision Guidance
- **vs aggregate**: Does it own behavior and enforce invariants? → aggregate. Is it a data structure? → value-object
- **vs command-use-case-input**: Is it the specific input for one command? → command-use-case-input. Is it reused across multiple contexts? → value-object
- **vs external-client-model**: Does it represent a domain concept? → value-object. Does it represent an external API shape? → external-client-model
