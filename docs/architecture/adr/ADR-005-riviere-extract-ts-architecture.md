# ADR-005: riviere-extract-ts Architecture

**Status:** Accepted
**Date:** 2026-01-28
**Deciders:** @ntcoding

## Context

`riviere-extract-ts` is a library for extracting architectural components from TypeScript source code using ts-morph AST parsing. The current implementation has:
- Flat `src/` structure with `predicates/` and `extraction-rules/` subdirectories
- Generic string transforms (`transforms.ts`) mixed with extraction-specific code
- Generic AST literal detection (`literal-detection.ts`) mixed with extraction rules
- Direct `minimatch` import in domain code (`extractor.ts`)
- Separate `errors.ts` for config-resolution errors
- Inline `{ file: string, line: number }` pattern repeated across files

## Decision

### 1. Libraries Are Pure Domain

Like `riviere-builder` (ADR-004), this is a library, not an application. Libraries have no entrypoint or use-cases layer—they ARE the domain.

**Structure for libraries:**
```text
src/
├── domain/           # All domain logic, split by concept
├── platform/         # Shared utilities and infrastructure wrappers
└── index.ts          # Public API exports
```

### 2. Organize Domain by Capability

Split domain logic into capability-based folders:

```text
src/
├── domain/
│   ├── predicate-evaluation/
│   │   └── evaluate-predicate.ts
│   ├── value-extraction/
│   │   ├── evaluate-extraction-rule.ts
│   │   ├── evaluate-extraction-rule-method.ts
│   │   ├── evaluate-extraction-rule-generic.ts
│   │   └── index.ts
│   ├── config-resolution/
│   │   ├── resolve-config.ts
│   │   └── config-resolution-errors.ts
│   └── component-extraction/
│       └── extractor.ts
├── platform/
│   ├── domain/
│   │   ├── string-transforms/
│   │   │   └── transforms.ts
│   │   └── ast-literals/
│   │       └── literal-detection.ts
│   └── infra/
│       └── glob-matching/
│           └── minimatch-glob.ts
└── index.ts
```

### 3. Extract Generic Utilities to platform/domain/

**transforms.ts** contains generic string transformations with no extraction dependency:
- `stripSuffix`, `stripPrefix`
- `toLowerCase`, `toUpperCase`
- `kebabToPascal`, `pascalToKebab`

Move to `platform/domain/string-transforms/`.

**literal-detection.ts** contains generic AST literal extraction:
- `isLiteralValue()`
- `extractLiteralValue()`
- `LiteralResult` type

Move to `platform/domain/ast-literals/`. While ts-morph-specific, it's not extraction-specific—any static analysis tool could use it.

### 4. Wrap minimatch in platform/infra/

The `minimatch` import in `extractor.ts` is a pure external dependency with no custom logic. Wrap it in `platform/infra/glob-matching/` so it can be swapped for another glob implementation if needed.

**Before:**
```typescript
import { minimatch } from 'minimatch'
// Used directly in findMatchingModule()
```

**After:**
```typescript
import { matchesGlob } from '../platform/infra/glob-matching'
// Implementation detail hidden behind interface
```

### 5. Co-locate Errors with Config Resolution

Move `ConfigLoaderRequiredError` and `MissingComponentRuleError` from `errors.ts` into `domain/config-resolution/config-resolution-errors.ts`. These errors are config-resolution specific and should live with that capability.

### 6. Extract SourceLocation Value Object

The pattern `{ file: string, line: number }` appears in:
- `DraftComponent.location`
- `ExtractionError` construction
- Error messages

Extract to a `SourceLocation` value object:

```typescript
export class SourceLocation {
  constructor(
    readonly file: string,
    readonly line: number
  ) {
    if (line < 1) {
      throw new Error(`Line number must be positive, got ${line}`)
    }
  }

  toString(): string {
    return `${this.file}:${this.line}`
  }
}
```

Place in `domain/component-extraction/source-location.ts` since it's primarily used for component locations.

### 7. Keep Large Public API Surface

The library exports fine-grained tools (10+ extraction rule evaluators, predicate evaluator, transforms). This is intentional—consumers pick what they need. The large API surface is the value proposition of a utility library.

### 8. ts-morph Is Domain-Appropriate

Unlike `minimatch`, ts-morph is the domain-appropriate tool for TypeScript AST analysis—it's the core of what this package does. Direct usage throughout domain code is acceptable. No wrapping needed.

## Consequences

### Positive

- Clear separation between domain logic and generic utilities
- Generic transforms and literal detection reusable within package
- minimatch can be swapped without touching domain code
- Errors co-located with their capability
- SourceLocation eliminates repeated inline type definitions
- Domain organized by capability, not technical concern

### Negative

- More directories (platform/domain/, platform/infra/)
- Migration effort to restructure
- Slightly deeper import paths

### Mitigations

- Directory structure matches established library pattern (ADR-004)
- Migration can be incremental
- Re-exports from index.ts keep public API unchanged

## Alternatives Considered

### Keep Flat Structure

**Why rejected:** Generic utilities mixed with domain-specific code violates separation of concerns. `transforms.ts` has zero dependency on extraction context—it's pure string manipulation that any package could use.

### Wrap ts-morph

**Why rejected:** ts-morph IS the domain for TypeScript AST analysis. Wrapping it would add ceremony without value. Unlike minimatch (generic glob matching), ts-morph is purpose-built for exactly what this package does.

### Reduce Public API Surface

**Why rejected:** Fine-grained exports are the point of a utility library. Consumers should be able to use individual extraction rules, predicates, and transforms as needed.
