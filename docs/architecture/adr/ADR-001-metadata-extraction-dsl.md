# ADR-001: Metadata Extraction DSL

**Status:** Accepted
**Date:** 2026-01-15
**Deciders:** @ntcoding

## Context

Phase 10 extracts component identity (type, name, location). Draft components lack metadata required by the Riviere schema:

| Component | Required Fields |
|-----------|----------------|
| API (REST) | `apiType`, `httpMethod`, `path` |
| API (GraphQL) | `apiType`, `operationName` |
| Event | `eventName` |
| EventHandler | `subscribedEvents` |
| DomainOp | `operationName` |
| UI | `route` |

Teams use diverse conventions for marking architectural components: decorators, base classes, interfaces, naming patterns, static properties, file paths. A flexible DSL is needed to extract metadata from these varied sources.

## Decision

### Extraction Rule Taxonomy

We define 11 extraction rule types organized by metadata source:

**Literal values:**
- `literal` — Hardcoded value (e.g., `apiType: { literal: 'REST' }`)

**From code structure:**
- `fromClassName` — Extract from class name with optional transform
- `fromMethodName` — Extract from method name with optional transform
- `fromFilePath` — Extract from file path using regex capture

**From class members:**
- `fromProperty` — Extract from static or instance property

**From decorators:**
- `fromDecoratorArg` — Extract from decorator argument (by position or name)
- `fromDecoratorName` — Extract from the decorator name itself (with optional mapping)

**From TypeScript types:**
- `fromGenericArg` — Extract from generic type argument (e.g., `IEventHandler<OrderCreatedEvent>`)
- `fromMethodSignature` — Extract method parameters and return type
- `fromConstructorParams` — Extract constructor parameter names and types
- `fromParameterType` — Extract type name of parameter at specified position

**Transforms** apply to any rule: `stripSuffix`, `stripPrefix`, `toLowerCase`, `toUpperCase`, `kebabToPascal`, `pascalToKebab`.

### Source of Truth Principle

**Extract metadata from where runtime actually uses it.**

If the application reads `Controller.route` at runtime, we extract `Controller.route`. Never duplicate data into annotations that can drift from reality.

This means:
- Decorator arguments over comments
- Static properties over separate config files
- Type information over naming conventions (when types are available)

### Enforcement Philosophy

**Convention without enforcement is unreliable.**

Every extraction rule should have a corresponding enforcement mechanism:

1. **Compiler over linter** — Prefer TypeScript interfaces and abstract classes over ESLint rules. Compiler errors are harder to ignore.

2. **Fail fast at config time** — Config validation rejects configs missing required extraction rules. No silent gaps.

3. **Fail fast at extraction time** — Default behavior is strict. Missing required fields cause extraction failure. Users fix at the source.

4. **Missing fields are data** — In lenient mode (`--allow-incomplete`), missing fields are tracked in `_missing` array. Structured data for automation, not just warnings.

### Extract Block Structure

Detection rules now include an optional `extract` block:

```yaml
api:
  find: methods
  where:
    hasDecorator:
      name: [Get, Post, Put, Delete]
  extract:
    apiType: { literal: 'REST' }
    httpMethod: { fromDecoratorName: true }
    path: { fromDecoratorArg: { position: 0 } }
```

Each key in `extract` maps to a Riviere schema field. Each value is an extraction rule.

## Consequences

### Positive

- Teams can adopt extraction without changing existing code conventions
- Source-of-truth extraction prevents annotation drift
- Early validation surfaces config errors before extraction runs
- Structured `_missing` data enables AI-assisted completion workflows

### Negative

- More complex config schema to learn
- Some extraction rules require understanding of TypeScript AST concepts
- Enforcement mechanisms must be maintained alongside extraction rules

### Neutral

- Config validation moved from extractor to config package
- TypeScript types mirror JSON schema (dual maintenance)

## References

- PRD Phase 11: Metadata Extraction
- `packages/riviere-extract-config/extraction-config.schema.json`
