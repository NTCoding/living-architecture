# command-use-case

## Purpose
A class that orchestrates a write-side workflow: loading state, invoking domain behavior, and returning a result. Dependencies are injected via constructor.

## Behavioral Contract
A command use case class has exactly one public method (`execute`) that follows this sequence:
1. **Load** — use the injected repository to load the aggregate from persisted state
2. **Invoke** — call a method on the aggregate to perform domain behavior
3. **Return** — return a typed result (command-use-case-result)

Optionally, between invoke and return:
- **Save** — persist the modified aggregate back through the repository

The `execute` method accepts exactly one parameter typed as a `command-use-case-input`.

## Examples

### Canonical Example
```typescript
/** @riviere-role command-use-case */
export class ExtractDraftComponents {
  constructor(private readonly repository: ExtractionProjectRepository) {}

  execute(input: ExtractDraftComponentsInput): ExtractDraftComponentsResult {
    const project = this.repository.load(input)
    return project.extractDraftComponents(input.options)
  }
}
```

### Edge Cases
- A command that loads but does not save (read-then-transform workflows) is still a command-use-case if it orchestrates domain behavior
- A command that delegates to multiple aggregate methods in sequence is valid if those methods are on the same aggregate

## Anti-Patterns

### Common Misclassifications
- **Not a domain-service**: domain services contain pure business logic with no loading/saving. If it uses a repository to load state, it is a command-use-case.
- **Not a cli-entrypoint**: entrypoints translate external input (CLI flags) into a command-use-case-input and call the command. They do not load aggregates.
- **Not a command-input-factory**: factories construct the input object from raw external data. They do not invoke domain behavior.

### Mixed Responsibility Signals
- If-else branches that decide WHAT operation to perform (not just how) — likely multiple command use cases merged into one
- Direct calls to external libraries (ts-morph, fs, git) instead of going through a repository — infrastructure leaking into the command
- Formatting or presenting results for output — cli-output-formatter responsibility leaking in
- Constructing the input object from CLI flags — command-input-factory responsibility leaking in
- Multiple unrelated aggregates being loaded and orchestrated — likely needs splitting into separate commands
- Instantiating repositories with `new` inside the execute method — dependencies must be constructor-injected

## Decision Guidance
- **vs domain-service**: Does it load/save through a repository? → command-use-case. Pure logic operating on passed-in data? → domain-service
- **vs cli-entrypoint**: Does it know about CLI frameworks (Commander, yargs)? → cli-entrypoint. Does it accept a typed input and return a typed result? → command-use-case
- **vs aggregate-repository**: Does it coordinate load→invoke→save? → command-use-case. Does it only handle loading/saving? → aggregate-repository

## References
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html) — Commands vs queries separation
- Separation of Concerns Skill Q3: "Orchestrates write operations?" → commands/
