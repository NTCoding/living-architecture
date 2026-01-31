# riviere-extract-ts

TypeScript extractor for detecting architectural components from source code using ts-morph.

Architecture defined in [ADR-005](../../docs/architecture/adr/ADR-005-riviere-extract-ts-architecture.md).

## Purpose

Reads extraction configs and extracts component nodes from TypeScript source code using AST parsing. This is the deterministic, config-driven extractor that runs in seconds without AI or network calls.

## Principles

1. **Deterministic extraction** - No AI, no network calls, same results every time for the same input
2. **Config-driven** - All extraction rules come from validated ExtractionConfig (riviere-extract-config)
3. **ts-morph for AST** - TypeScript-native parser with full type information and compiler APIs
4. **Pure functions** - No side effects, testable in isolation, functional composition
5. **Component extraction only** - This phase extracts component nodes; connections come later (PRD 12)
6. **Predicate composability** - Detection rules compose via and/or logic for complex conditions
7. **Module-based organization** - Config organizes rules by path patterns (glob matching)
8. **Fail fast** - Invalid configs rejected at load time by riviere-extract-config, not during extraction

## Architecture

### Core Concepts

**Draft Components** - Extracted components before connection detection. Contains component identity (type, name) and location (file, line) but no relationships. See domain glossary for definition.

**Predicates** - Detection logic that answers "does this code element match the rule?" Nine predicate types: hasDecorator, hasJSDoc, extendsClass, implementsInterface, nameEndsWith, nameMatches, inClassWith, and, or.

**Modules** - Path-based organization of extraction rules. Each module targets a glob pattern and defines detection rules for 6 component types.

### Dependencies

- **@living-architecture/riviere-extract-config** - Config schema, types, and validation (already built at extraction time)
- **ts-morph** - TypeScript AST parsing and compiler API access

### What This Package Does NOT Do

- **Schema validation** - Done by riviere-extract-config at config load time
- **Connection detection** - Deferred to future PRD (PRD 12)
- **AI/LLM extraction** - Deterministic only, no external services
- **Runtime code execution** - Static analysis only

## Testing Strategy

- **Unit tests** - Each predicate tested in isolation with positive and negative cases
- **Integration tests** - End-to-end extraction from sample TypeScript code to JSON output
- **In-memory file system** - ts-morph's `useInMemoryFileSystem: true` for fast, isolated tests
- **100% coverage enforced** - Vitest with v8 coverage, thresholds in vitest.config.mts
