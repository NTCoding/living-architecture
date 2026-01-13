# Deterministic Extraction

Same code always produces the same architecture graph. No AI variability.

## What It Is

Deterministic extraction uses a language-agnostic configuration DSL to define detection rules. A language-specific extractor (like TypeScript) parses your code and identifies components matching those rules.

**Fast** — Runs in seconds. No AI, no network calls.

**Deterministic** — Same code always produces same results.

**CI-Ready** — Integrate into build pipelines and gates.

## When to Use

| Use Case | AI-Assisted | Deterministic |
|----------|-------------|---------------|
| Initial extraction from unknown codebase | ✓ | |
| Codebase without architectural conventions | ✓ | |
| CI/build pipeline integration | | ✓ |
| Consistent, repeatable extraction | | ✓ |
| Speed (seconds vs minutes) | | ✓ |
| Codebases following conventions | | ✓ |

**Best practice**: Use AI-assisted for initial extraction. Move to deterministic once you've established architectural conventions.

## How It Works

1. **Define extraction config** — Specify how to detect APIs, UseCases, DomainOps, Events, EventHandlers, UI components
2. **Run extractor** — Language-specific tool (TypeScript, Java, Python) parses code using config rules
3. **Output draft components** — Components with type, name, location, domain (no connections yet)
4. **Feed to CLI** — Use CLI commands to build full Rivière graph

## The Config DSL

The config format is **language-agnostic** — defined in JSON Schema, works across TypeScript, Java, Python, etc.

**Current implementation**: TypeScript (`@living-architecture/riviere-extract-ts`)

**You can build extractors for other languages** using the same config format.

```yaml
modules:
  - name: "orders"
    path: "src/orders/**/*.ts"
    api:
      find: "methods"
      where:
        inClassWith:
          hasDecorator:
            name: "APIContainer"
    useCase:
      find: "classes"
      where:
        hasDecorator:
          name: "UseCase"
    # ... other component types
```

[See Config Reference →](/reference/extraction-config/schema)

## Modular Architecture

You can swap any piece:

- **Use our config + your extractor** — Implement AST parsing for your language
- **Use our extractor + your config** — Custom detection rules for TypeScript
- **Use our predicates + your parser** — Reuse predicate logic in different tools
- **Build entirely custom** — Use as reference implementation

## TypeScript Implementation

We provide a complete reference implementation for TypeScript:

- **Decorators** for annotating code (`@APIContainer`, `@UseCase`, etc.)
- **Default config** ready to use
- **ESLint enforcement** to ensure coverage
- **Extractor** using ts-morph for AST parsing

[Get Started with TypeScript →](/extract/deterministic/typescript/getting-started)

## Enforcement

Deterministic extraction works best with enforcement. Without enforcement, extraction becomes unreliable as code evolves.

[Learn about Enforcement →](/extract/deterministic/enforcement)

## See Also

- [Config Schema Reference](/reference/extraction-config/schema) — Complete DSL specification
- [Predicate Reference](/reference/extraction-config/predicates) — All 9 detection predicates
- [TypeScript Getting Started](/extract/deterministic/typescript/getting-started) — 10-minute tutorial
