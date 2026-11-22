# aggregate-repository

## Purpose
A class that handles loading and saving an aggregate — the boundary between domain and persistence infrastructure.

## Behavioral Contract
1. **Load** — assemble the aggregate from persisted state (files, database, APIs) and return it
2. **Save** (optional) — persist the aggregate's current state
3. The repository MUST return an aggregate, not raw data or partial state
4. May use external-client-services internally to access storage, parsers, or other tools

## Examples

### Canonical Example
```typescript
/** @riviere-role aggregate-repository */
export class RiviereProjectRepository {
  loadByExtractionConfigPath(input: LoadInput): RiviereProject {
    const project = createConfiguredProject(input.configPath)
    const contexts = this.buildModuleContexts(project)
    return new RiviereProject(project, contexts)
  }

  private buildModuleContexts(project: Project): ModuleContext[] {
    // internal assembly logic
  }
}
```

### Edge Cases
- A public method returning an aggregate must be named `load` or `loadBy<AccessCriterion>`. The access criterion says how the aggregate is found, such as `loadByGraphPath` or `loadByExtractionConfigPath`.
- Whether a `loadBy` suffix names a real access criterion is reviewed semantically; the role check enforces only the lexical loading-name contract.
- Persistence methods such as `save` and private helper methods are not constrained by the loading-name rule.
- Private helper methods inside the repository are implementation details, not separate roles

## Anti-Patterns

### Common Misclassifications
- **Not an external-client-service**: repositories assemble aggregates from multiple sources. External client services provide single technical capabilities.
- **Not a command-use-case**: repositories only handle loading/saving, not orchestration of domain behavior.

### Mixed Responsibility Signals
- If the repository contains business logic or makes domain decisions — that belongs on the aggregate or a domain-service
- If the repository returns raw data instead of an aggregate — it may be an external-client-service instead
- If the repository calls other repositories — potential aggregate boundary issue

## Decision Guidance
- **vs external-client-service**: Does it return an aggregate? → aggregate-repository. Does it return raw data or library-specific types? → external-client-service
- **vs command-use-case**: Does it only load/save? → aggregate-repository. Does it orchestrate load→invoke→save? → command-use-case
