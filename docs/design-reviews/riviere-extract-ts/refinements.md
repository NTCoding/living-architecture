# Refinements: riviere-extract-ts

This document applies **Separation of Concerns** and **Tactical DDD** principles to improve the initial design.

---

## Separation of Concerns Refinements

### Checklist Evaluation

| Check | Status | Notes |
|-------|--------|-------|
| 1. features/, platform/, shell/ exist | FAIL | Uses flat src/ with predicates/, extraction-rules/ |
| 2. platform/ contains only domain/ and infra/ | N/A | No platform/ exists |
| 3. features contain entrypoint/, use-cases/, domain/ | N/A | No features/ exist |
| 4. shell/ contains no business logic | N/A | No shell/ exists |
| 5. Feature-specific code in features/ | FAIL | Capabilities mixed in src/ |
| 6. Shared logic in platform/domain/ | FAIL | transforms.ts and literal-detection.ts not separated |
| 7. External service wrappers in platform/infra/ | N/A | ts-morph used directly (acceptable for AST parsing) |
| 8. Custom folders inside domain/, not use-cases/ | N/A | No use-cases/ exists |
| 9. Functions in file share same state | PASS | Files are cohesive |
| 10. File names relate to directory | PASS | Names are descriptive |
| 11. Directory names describe contents | PASS | predicates/, extraction-rules/ accurate |
| 12. use-cases/ contains only use-case files | N/A | No use-cases/ exists |
| 13. No generic type-grouping files | PASS | errors.ts is focused |
| 14. entrypoint/ is thin | N/A | No entrypoint/ exists |

### Principle Violations

#### P2: Separate feature-specific from shared capabilities

**Violation:** `transforms.ts` contains generic string transformations (stripSuffix, pascalToKebab, etc.) that belong in `platform/domain/`. These are not extraction-specific - any package needing case conversion could use them.

**Violation:** `literal-detection.ts` contains generic AST literal extraction (`isLiteralValue`, `extractLiteralValue`) that could serve any ts-morph-based analysis tool.

#### P3: Separate intent from execution

**Current state:** The high-level flow in `extractor.ts` is visible:
```text
extractComponents -> extractFromFile -> extractFromModule -> extractComponentType
```

**Minor issue:** Helper functions (`findPropertyInHierarchy`, `extractPositionalArg`, `extractNamedArg`) are interleaved with evaluator functions in `evaluate-extraction-rule.ts`. Grouping by abstraction level would improve readability.

#### P5: Separate functions that don't have related names

**Current state:** Functions in `evaluate-extraction-rule.ts` share the `evaluateFrom*Rule` pattern and operate on extraction rules - cohesive.

**Minor issue:** The file has 12 exports spanning class, method, decorator, and file sources. Splitting by source (as suggested in initial design) would make each file smaller and more focused.

### Recommended Structure Changes

```text
packages/riviere-extract-ts/
└── src/
    ├── features/
    │   ├── component-extraction/
    │   │   ├── entrypoint/
    │   │   │   └── extract-components.ts
    │   │   └── domain/
    │   │       ├── draft-component.ts
    │   │       └── module-matching.ts
    │   │
    │   ├── predicate-evaluation/
    │   │   └── domain/
    │   │       ├── evaluate-predicate.ts
    │   │       ├── decorator-predicates.ts
    │   │       ├── inheritance-predicates.ts
    │   │       └── naming-predicates.ts
    │   │
    │   ├── value-extraction/
    │   │   └── domain/
    │   │       ├── class-extraction.ts
    │   │       ├── method-extraction.ts
    │   │       ├── decorator-extraction.ts
    │   │       └── file-extraction.ts
    │   │
    │   └── config-resolution/
    │       └── domain/
    │           ├── resolve-module.ts
    │           └── resolution-errors.ts
    │
    ├── platform/
    │   └── domain/
    │       ├── string-transforms/
    │       │   └── transforms.ts
    │       └── ast-literals/
    │           └── literal-detection.ts
    │
    └── shell/
        └── index.ts
```

---

## Tactical DDD Refinements

### Checklist Evaluation

| Check | Status | Notes |
|-------|--------|-------|
| 1. Domain isolated from infrastructure | PASS | No DB/HTTP/logging in domain logic |
| 2. Names from domain, not jargon | PARTIAL | "Predicate" is domain term, but "evaluate" is generic |
| 3. Use cases are user intentions | N/A | No explicit use cases; package is a library |
| 4. Business logic in domain objects | PARTIAL | Some logic in functions, not objects |
| 5. States modeled as distinct types | PARTIAL | DraftComponent is single interface, not state machine |
| 6. Hidden concepts extracted and named | FAIL | Several implicit concepts not named |
| 7. Aggregates around invariants | N/A | No aggregates; stateless functional extraction |
| 8. Values extracted into value objects | FAIL | Primitives used where value objects would help |

### Principle Violations

#### P2: Use rich domain language

**Issue:** Some names use generic developer jargon:

| Current | Domain Alternative | Reason |
|---------|-------------------|--------|
| `evaluatePredicate()` | `matchesPredicate()` | "Match" is what predicates do; "evaluate" is generic |
| `evaluateFromClassNameRule()` | `extractFromClassName()` | Extraction is the domain action |
| `ExtractionContext` | `SourceLocation` | More precise - it's about where in source code |
| `ExtractionResult` | `ExtractedValue` | Result of extraction, not the process |

**Issue:** The function name `extractComponents` could be more specific about what it produces: `extractDraftComponents` makes clear these are incomplete.

#### P5: Separate generic concepts

**Issue:** `transforms.ts` is generic string manipulation. It has no dependency on extraction context and could exist in any project needing case conversion. This belongs in `platform/domain/` as a shared utility.

**Issue:** `literal-detection.ts` is generic AST literal extraction. While it uses ts-morph, it's not specific to architectural extraction - any static analysis tool could use it.

#### P6: Make the implicit explicit

**Issue 1: Detection Target not named**

The code repeatedly distinguishes between classes, methods, and functions as detection targets, but this concept has no explicit type:

```typescript
const FIND_TARGETS: readonly string[] = ['classes', 'methods', 'functions']
```

Should be:
```typescript
type DetectionTarget = 'classes' | 'methods' | 'functions'
```

**Issue 2: Source Location is a repeated concept**

Multiple places construct `{ file, line }` objects:
- `DraftComponent.location`
- `ExtractionError.location`
- `DecoratorLocation` in evaluate-extraction-rule.ts

This should be a shared value object: `SourceLocation`.

**Issue 3: Predicate category not explicit**

Predicates fall into categories:
- **Decorator predicates:** hasDecorator
- **Documentation predicates:** hasJSDoc
- **Inheritance predicates:** extendsClass, implementsInterface
- **Naming predicates:** nameEndsWith, nameMatches
- **Context predicates:** inClassWith
- **Composite predicates:** and, or

These categories are implicit in the code structure but not named in types.

**Issue 4: Extraction source not explicit**

Extraction rules extract from different sources:
- **Literal:** hardcoded value
- **Class metadata:** className, property, genericArg
- **Method metadata:** methodName, methodSignature, parameterType
- **Decorator metadata:** decoratorArg, decoratorName
- **File metadata:** filePath

The code groups these in separate files but the concept "extraction source" has no type.

#### P8: Extract immutable value objects

**Issue 1: SourceLocation**

Repeated pattern `{ file: string, line: number }` should be a value object:

```typescript
class SourceLocation {
  constructor(
    readonly file: string,
    readonly line: number
  ) {}

  toString(): string {
    return `${this.file}:${this.line}`
  }
}
```

**Issue 2: ExtractedValue discriminated union**

`ExtractionResult` is `{ value: string | number | boolean | string[] }`. The type information is lost. Consider:

```typescript
type ExtractedValue =
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'strings'; value: string[] }
  | { kind: 'signature'; value: MethodSignature }
  | { kind: 'parameters'; value: ParameterInfo[] }
```

Note: `LiteralResult` already does this correctly for literals.

**Issue 3: Transform as composable value**

`Transform` is imported from config package, but the application of transforms could be made more explicit with a `TransformPipeline` that makes the composition visible:

```typescript
class TransformPipeline {
  private readonly steps: TransformStep[]

  apply(value: string): string {
    return this.steps.reduce((v, step) => step.apply(v), value)
  }
}
```

### Domain Model Assessment

**Current model:** Mostly functional with data structures passed through functions.

**Missing domain objects:**

1. **DetectionTarget** - What can be detected (class, method, function)
2. **SourceLocation** - Where something is in source code
3. **PredicateCategory** - Grouping of predicate types
4. **ExtractionSource** - Where extraction rules read from

**Rich types that exist:**
- `DraftComponent` - Good, captures the incomplete component concept
- `LiteralResult` - Good, discriminated union for type safety
- `MethodSignature` and `ParameterInfo` - Good, domain-specific structures

---

## Summary of Refinements

### High Priority (Structural)

1. **Introduce features/platform/shell structure** to properly separate capabilities
2. **Extract platform/domain/ utilities** for transforms and literal detection
3. **Create SourceLocation value object** to eliminate repeated `{ file, line }` patterns

### Medium Priority (Naming)

1. **Rename to domain language:** `evaluatePredicate` -> `matchesPredicate`, `evaluateFrom*Rule` -> `extractFrom*`
2. **Name implicit concepts:** `DetectionTarget`, `PredicateCategory`, `ExtractionSource`
3. **Rename main entry point:** `extractComponents` -> `extractDraftComponents`

### Low Priority (Type Safety)

1. **Unify ExtractedValue type** as discriminated union across all extraction rules
2. **Extract TransformPipeline** to make transform composition explicit

### Deferred (Not Recommended for Current Size)

- Full feature separation into entrypoint/use-cases/domain (package is ~600 lines)
- Aggregate patterns (package is stateless functional extraction)
- Full domain objects (functional approach is appropriate for this use case)
