# external-client-model

## 🚨 CRITICAL NAMING RULE
**The name must describe the EXTERNAL TOOL/SERVICE shape, not a domain concept.**

If the name uses vocabulary from the project's domain (the nouns that appear in `docs/architecture/domain-terminology/`, role names, aggregate names, or core feature names), then this role is wrong — the type belongs in `domain/` as a `value-object`, not in `infra/external-clients/`.

- ✅ `OxlintConfig`, `StripeCustomerResponse`, `GitRepositoryInfo`, `FilesystemEntry`
- ❌ `RoleEnforcementConfig`, `OrderDto`, `ExtractionResultModel`

If you find yourself putting a domain noun in an `infra/external-clients/**` model name, STOP. The type belongs in `domain/`.

## Purpose
A type that represents data structures from or for external services — the shapes that external-client-services accept or return.

## Behavioral Contract
This is a data structure. It:
1. Defines the contract between the codebase and an external service
2. May mirror external API shapes or represent configuration for external tools
3. Lives in the infrastructure layer alongside external-client-services

## Examples

### Canonical Example
```typescript
/** @riviere-role external-client-model */
export interface GitRepositoryInfo {
  repositoryRoot: string
  currentBranch: string
  remoteName: string
}
```

## Anti-Patterns

### Common Misclassifications
- **Not a value-object**: value objects are domain concepts. External client models are infrastructure types.
- **Not a command-use-case-input**: inputs are for commands. Models are for external service boundaries.

### Mixed Responsibility Signals
- If the type contains both external service fields AND domain behavior fields — split into external model + domain type

## Decision Guidance
- **vs value-object**: Does it represent an external service's data shape? → external-client-model. Does it represent a domain concept? → value-object
