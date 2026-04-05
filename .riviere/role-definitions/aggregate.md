# aggregate

## Purpose
A class or type that represents the central domain entity in a feature — it owns state and enforces business invariants.

**Creating a new aggregate is a major domain model decision.** AI assistants: you MUST confirm with the user before classifying any declaration as aggregate. Add the name to `approvedInstances` in `.riviere/roles.ts` only after explicit user approval.

## Behavioral Contract
An aggregate:
1. **Owns state** — holds the data that represents the current state of a domain concept
2. **Enforces invariants** — business rules are methods on the aggregate, not external functions
3. **Exposes behavior** — public methods represent domain operations that may modify state
4. **Is loaded/saved through a repository** — never created ad-hoc in commands or services
5. **Exposes mutation** — at least one public method modifies or replaces the aggregate's state. A class with only read-only methods is NOT an aggregate.

## Examples

### Canonical Example
```typescript
/** @riviere-role aggregate */
export class ExtractionProject {
  constructor(
    private readonly project: Project,
    private readonly moduleContexts: ModuleContext[],
  ) {}

  extractDraftComponents(options: ExtractionOptions): ExtractDraftComponentsResult {
    // domain logic that operates on internal state
  }

  enrichComponents(options: EnrichmentOptions): EnrichDraftComponentsResult {
    // domain logic that operates on internal state
  }
}
```

### Edge Cases
- An interface defining the aggregate shape is also role `aggregate`
- A type alias for the aggregate is also role `aggregate`
- An aggregate may be immutable (returning new instances from methods)

## Anti-Patterns

### Common Misclassifications
- **Not a value-object**: aggregates own behavior and enforce invariants. Value objects are data-only with equality semantics.
- **Not an external-client-model**: aggregates are domain concepts, not external data shapes.
- **Not a command-use-case-result**: results are output contracts, not domain entities.
- **Not a query-model**: If a class holds immutable state and exposes only read-only query methods, it is a `query-model`, not an aggregate. Validation on construction does not make something an aggregate — query models also validate their input data.

### Mixed Responsibility Signals
- If the class makes direct calls to external libraries (fs, git, HTTP) — infrastructure leaking in, extract to external-client-service
- If the class loads its own state from disk/database — repository responsibility leaking in
- If the class formats output for display — cli-output-formatter responsibility leaking in

## Decision Guidance
- **vs value-object**: Does it enforce invariants and own behavior? → aggregate. Is it a simple data structure with no behavior? → value-object
- **vs domain-service**: Is the behavior tied to specific state? → aggregate method. Is the behavior operating on data passed in without owning it? → domain-service
- **vs query-model**: Does any method modify state? → aggregate. All methods read-only over immutable state? → query-model. **When uncertain, ask the user — do not default to aggregate.**

## References
- [Tactical DDD: Aggregates](https://www.domainlanguage.com/ddd/) — Aggregate design patterns
