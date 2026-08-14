# Step 2: Define Component Extraction Rules

## Objective

Define how to identify each component type in this codebase.

## Prerequisites

Read `.riviere/config/metadata.md` for codebase context.

## Component Types

| Type | Definition |
|------|-----------|
| UI | User-facing screens/pages |
| API | HTTP endpoints |
| UseCase | Application service coordinating a user goal |
| DomainOp | Business logic — aggregate methods, domain services |
| Event | Domain event published after something happens |
| EventHandler | Subscriber that reacts to an event |

For each type in this codebase, define an extraction rule.

Also look for patterns that don't fit the built-in types. For each potential Custom type:
1. Present the pattern to the user with a suggested name
2. Record user's decision (accepted/rejected) in component-definitions.md

Example:
```markdown
## Proposed Custom Types

| Pattern | Suggested Name | Decision |
|---------|----------------|----------|
| Background jobs in `src/jobs/` | `BackgroundJob` | Accepted |
| Saga orchestrators | `Saga` | Rejected - treat as UseCase |
```

## Extraction Rule Format

Only extract fields that exist in the Rivière schema. Run `npx riviere builder add-component --help` to see valid fields per type.

**Avoid over-fitting:** Location should be broad (e.g., `src/` or `apps/`). Let class pattern and select do the identification work.

```markdown
## [ComponentType]

### Identification

**Location:** [broad folder - avoid over-specific paths]

**Class pattern:** [base class, decorator, or naming convention]

**Select:** [what to extract - class, methods, etc.]

### Fields (schema fields only)

| Schema Field | Source in Code |
|--------------|----------------|
| [field] | [where to get it] |

### Exclude

- [patterns to skip]

### Example

[Brief code snippet showing what matches and what doesn't]
```

## Example

```markdown
## DomainOp

### Identification

**Location:** `src/domain/`

**Class pattern:** extends `Aggregate`

**Select:** public methods

### Fields

| Field | Source |
|-------|--------|
| entity | Containing class name |
| operation | Method name |

### Exclude

- Private methods
- Getters (`get*`, `is*`, `has*`)
- Static hydration (`hydrate*`)

### Example

\`\`\`typescript
// src/domain/employee/employee.ts
export class Employee extends Aggregate {
  static register(...) { ... }        // ✓ DomainOp: Employee.register
  public remove(...) { }              // ✓ DomainOp: Employee.remove
  public activate(...) { }            // ✓ DomainOp: Employee.activate
  private applyRegistered() { }       // ✗ private
  public getState() { }               // ✗ getter
}
\`\`\`
```

### Critical: Rules Only

Do NOT list actual components found in the codebase. Step 2 defines **patterns** for finding components. Step 3 performs the actual scan.

**Wrong:** "Components: order-begin, order-confirm, order-cancel"
**Right:** "Pattern: public methods in classes extending Aggregate"

One brief example per rule is acceptable to illustrate the pattern.

## Output

Save as `.riviere/config/component-definitions.md`

**Reminder:** This file contains extraction rules and examples only—not a list of components.

---

## Linking Patterns

Links that aren't via direct code reference (imports, method calls). These require scanning for client patterns.

### HTTP Client Mappings

Map HTTP clients to their target domains. AI uses this in step 4 for `link-http --domain`.

```markdown
## HTTP Clients

| Client Pattern | Target Domain | Internal/External |
|----------------|---------------|-------------------|
| `ordersApi` | orders | internal |
| `inventoryClient` | inventory | internal |
| `stripeClient` | Stripe | external |
```

**Common client patterns to look for:**
- `*Client`, `*ApiClient`, `*Api`, `*Gateway`, `*Sdk`
- `axios.create(`, `new HttpClient(`, `fetch(`
- `constructor(private *Api:`

### Linking Rule Format

For non-HTTP patterns (message queues, etc.):

```markdown
## [Pattern Name]

**Indicator:** [code pattern to scan for]
**From:** [component type]
**To:** [component type or external]
```

### Validation Rules

Define rules to catch missing links:

```markdown
## Validation

- [component type] must link to [expected target]
- BFF APIs must link to backend or external (not just internal UseCase)
```

## Output

Save as `.riviere/config/linking-rules.md`

## Completion

Present extraction rules AND linking rules to user for review.

**Step 2 complete.** Wait for user feedback before proceeding.
