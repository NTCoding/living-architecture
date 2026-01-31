# Separation of Concerns Analysis: riviere-extract-ts

## Package Overview

**Package:** `@living-architecture/riviere-extract-ts`
**Location:** `packages/riviere-extract-ts/`
**Purpose:** TypeScript extractor for detecting architectural components from source code using ts-morph AST parsing

## Current Structure

```text
packages/riviere-extract-ts/
└── src/
    ├── index.ts                                    # Public exports
    ├── extractor.ts                                # extractComponents() main entry
    ├── resolve-config.ts                           # Config resolution with extends
    ├── errors.ts                                   # Config-related error classes
    ├── test-fixtures.ts                            # Test helper factories
    ├── predicates/
    │   ├── index.ts                                # Re-exports
    │   └── evaluate-predicate.ts                   # Predicate evaluation engine
    └── extraction-rules/
        ├── index.ts                                # Re-exports
        ├── evaluate-extraction-rule.ts             # Core extraction rule evaluators
        ├── evaluate-extraction-rule-method.ts      # Method signature extraction
        ├── evaluate-extraction-rule-generic.ts     # Generic argument extraction
        ├── literal-detection.ts                    # Literal value extraction
        └── transforms.ts                           # String transformation utilities
```

## Checklist Evaluation

### 1. Verify features/, platform/, shell/ exist at root

**Status:** FAIL

The package uses `src/` with two subdirectories (`predicates/`, `extraction-rules/`). No `features/`, `platform/`, or `shell/` directories exist.

### 2. Verify platform/ contains only domain/ and infra/

**Status:** N/A (no platform/ directory exists)

### 3. Verify each feature contains only entrypoint/, use-cases/, domain/

**Status:** N/A (no features/ directory exists)

### 4. Verify shell/ contains no business logic

**Status:** N/A (no shell/ directory exists)

### 5. Verify code belonging to one feature is in features/[feature]/

**Status:** FAIL

The package has identifiable features that are partially separated:
- **Component Extraction:** Main extraction orchestration (`extractor.ts`)
- **Predicate Evaluation:** Detection logic for code matching (`predicates/`)
- **Value Extraction:** Extracting values from AST nodes (`extraction-rules/`)
- **Config Resolution:** Resolving module inheritance (`resolve-config.ts`)

The `predicates/` and `extraction-rules/` directories show some separation, but they are organized by technical concern rather than feature boundaries.

### 6. Verify shared business logic is in platform/domain/

**Status:** FAIL

Shared logic exists but is not in `platform/domain/`:
- `transforms.ts`: String transformations (stripSuffix, pascalToKebab, etc.) - generic utilities
- `literal-detection.ts`: AST literal extraction - could be shared with other extractors

### 7. Verify external service wrappers are in platform/infra/

**Status:** PARTIAL PASS

The package depends on `ts-morph` for AST parsing. However, `ts-morph` is used directly throughout the codebase rather than wrapped. Since ts-morph is a domain-appropriate tool for TypeScript AST analysis (the package's core purpose), this is acceptable. There are no external service integrations that would benefit from wrapping.

### 8. Verify custom folders are inside domain/, not use-cases/

**Status:** N/A (no domain/ or use-cases/ directories exist)

### 9. Verify each function relies on same state as others in its class/file

**Status:** PASS

- `extractor.ts`: All functions operate on `Project`, `SourceFile`, or `ResolvedExtractionConfig` (consistent AST/config state)
- `evaluate-predicate.ts`: All functions operate on `Node` and `Predicate` (consistent state)
- `evaluate-extraction-rule.ts`: All functions operate on AST nodes (`ClassDeclaration`, `MethodDeclaration`, etc.) and extraction rules (consistent state)
- `evaluate-extraction-rule-method.ts`: All functions operate on method declarations (cohesive)
- `evaluate-extraction-rule-generic.ts`: Functions operate on class declarations for generic extraction (cohesive)
- `literal-detection.ts`: All functions operate on `Expression` nodes (cohesive)
- `transforms.ts`: All functions are pure string transformers (cohesive)
- `resolve-config.ts`: All functions operate on config structures (cohesive)
- `errors.ts`: All error classes are stateless value objects (cohesive)

### 10. Verify each file name relates to other files in its directory

**Status:** PASS

**predicates/:**
- `evaluate-predicate.ts` - clear purpose, single file

**extraction-rules/:**
- `evaluate-extraction-rule.ts` - main evaluators
- `evaluate-extraction-rule-method.ts` - method-specific evaluators
- `evaluate-extraction-rule-generic.ts` - generic argument evaluators
- `literal-detection.ts` - literal extraction support
- `transforms.ts` - transformation utilities

All names relate to the directory's purpose (extraction rules).

**Root src/:**
- `extractor.ts` - main extraction logic
- `resolve-config.ts` - config resolution
- `errors.ts` - error types
- `test-fixtures.ts` - test support

Names are descriptive but loosely related due to flat structure.

### 11. Verify each directory name describes what all files inside have in common

**Status:** PASS

- `predicates/`: Contains predicate evaluation logic (accurate)
- `extraction-rules/`: Contains extraction rule evaluation logic (accurate)

### 12. Verify use-cases/ contains only use-case files

**Status:** N/A (no use-cases/ directory exists)

### 13. Verify no generic type-grouping files spanning multiple capabilities

**Status:** PASS

- `errors.ts`: Contains only 2 error classes, both related to config resolution (focused)
- Types are defined inline or imported from `@living-architecture/riviere-extract-config`

### 14. Verify entrypoint/ is thin and never imports from domain/

**Status:** N/A (no entrypoint/ directory exists)

## Analysis Summary

### Identified Features (Capabilities)

1. **component-extraction**: Orchestrating extraction from source files
   - `extractor.ts` (extractComponents function)
   - Uses predicates and extraction rules

2. **predicate-evaluation**: Determining if AST nodes match detection rules
   - `predicates/evaluate-predicate.ts`
   - Nine predicate types: hasDecorator, hasJSDoc, extendsClass, implementsInterface, nameEndsWith, nameMatches, inClassWith, and, or

3. **value-extraction**: Extracting values from AST nodes
   - `extraction-rules/evaluate-extraction-rule.ts`
   - `extraction-rules/evaluate-extraction-rule-method.ts`
   - `extraction-rules/evaluate-extraction-rule-generic.ts`
   - `extraction-rules/literal-detection.ts`

4. **config-resolution**: Resolving module inheritance chains
   - `resolve-config.ts`
   - `errors.ts`

### Platform Candidates (Shared Logic)

- `transforms.ts`: Generic string transformations (stripSuffix, stripPrefix, toLowerCase, toUpperCase, kebabToPascal, pascalToKebab)
- `literal-detection.ts`: Generic AST literal extraction utilities

### Principle Violations

#### Principle 2: Separate feature-specific from shared capabilities

`transforms.ts` contains generic string transformations that have no dependency on extraction context. These could be used by any package requiring string case conversion or prefix/suffix manipulation. This belongs in `platform/domain/`.

`literal-detection.ts` contains `isLiteralValue()`, `extractLiteralValue()`, and `LiteralResult` type. While currently used only for extraction rules, these are generic AST utilities that could serve other ts-morph-based tools.

#### Principle 3: Separate intent from execution

`extractor.ts` maintains good separation. The high-level flow is visible:
```text
extractComponents -> extractFromFile -> extractFromModule -> extractComponentType
```

`evaluate-predicate.ts` has a clear if-chain structure showing the predicate evaluation flow, with each predicate type delegating to a specific evaluator function.

**Minor issue:** `evaluate-extraction-rule.ts` exports many functions (12) that could benefit from clearer grouping by extraction source (decorator, class, method, file path).

#### Principle 5: Separate functions that don't have related names

`evaluate-extraction-rule.ts` contains functions with varied prefixes:
- `evaluateLiteralRule()`
- `evaluateFromClassNameRule()`
- `evaluateFromMethodNameRule()`
- `evaluateFromFilePathRule()`
- `evaluateFromPropertyRule()`
- `evaluateFromDecoratorArgRule()`
- `evaluateFromDecoratorNameRule()`

These share the "evaluateFrom*Rule" pattern and all operate on extraction rules, so they are cohesive. However, the helper functions (`extractPositionalArg`, `extractNamedArg`, `findPropertyInHierarchy`) are interleaved and could be grouped more clearly.

## Recommended Structure

```text
packages/riviere-extract-ts/
└── src/
    ├── features/
    │   ├── component-extraction/
    │   │   ├── entrypoint/
    │   │   │   └── extract-components.ts    # Public extractComponents API
    │   │   ├── use-cases/
    │   │   │   └── extract-from-file.ts     # File-level extraction orchestration
    │   │   └── domain/
    │   │       ├── draft-component.ts       # DraftComponent type
    │   │       ├── module-matching.ts       # findMatchingModule logic
    │   │       └── component-creation.ts    # createClassComponent, etc.
    │   │
    │   ├── predicate-evaluation/
    │   │   └── domain/
    │   │       ├── evaluate-predicate.ts    # Main predicate evaluator
    │   │       ├── decorator-predicates.ts  # hasDecorator evaluation
    │   │       ├── inheritance-predicates.ts # extendsClass, implementsInterface
    │   │       └── naming-predicates.ts     # nameEndsWith, nameMatches
    │   │
    │   ├── value-extraction/
    │   │   └── domain/
    │   │       ├── class-extraction.ts      # fromClassName, fromProperty, fromGenericArg
    │   │       ├── method-extraction.ts     # fromMethodName, fromMethodSignature, fromParameterType
    │   │       ├── decorator-extraction.ts  # fromDecoratorArg, fromDecoratorName
    │   │       └── file-extraction.ts       # fromFilePath
    │   │
    │   └── config-resolution/
    │       ├── entrypoint/
    │       │   └── resolve-config.ts        # Public resolveConfig API
    │       └── domain/
    │           ├── module-resolution.ts     # Module extends resolution
    │           └── resolution-errors.ts     # ConfigLoaderRequiredError, etc.
    │
    ├── platform/
    │   └── domain/
    │       ├── string-transforms/
    │       │   └── transforms.ts            # Case conversion, prefix/suffix
    │       └── ast-literals/
    │           └── literal-detection.ts     # isLiteralValue, extractLiteralValue
    │
    └── shell/
        └── index.ts                         # Public API exports
```

## Key Findings

| Finding | Severity | Location |
|---------|----------|----------|
| Missing features/platform/shell structure | High | `/packages/riviere-extract-ts/src/` |
| Generic transforms not in platform/ | Medium | `/packages/riviere-extract-ts/src/extraction-rules/transforms.ts` |
| Value extraction functions could be grouped by source | Low | `/packages/riviere-extract-ts/src/extraction-rules/evaluate-extraction-rule.ts` |

## Recommendations

1. **Introduce feature directories** to separate component-extraction, predicate-evaluation, value-extraction, and config-resolution capabilities

2. **Extract platform/domain/** for generic utilities:
   - `string-transforms/` - Case conversion, prefix/suffix manipulation
   - `ast-literals/` - Literal value detection and extraction

3. **Group value extraction by source** - The current `evaluate-extraction-rule.ts` file has 12 exported functions. Consider splitting by extraction source:
   - `class-extraction.ts` for className, property, genericArg
   - `method-extraction.ts` for methodName, methodSignature, parameterType
   - `decorator-extraction.ts` for decoratorArg, decoratorName
   - `file-extraction.ts` for filePath

4. **Create shell/index.ts** as the single public API surface that composes and exports the features

## Trade-offs

**Current structure benefits:**
- Logical grouping via `predicates/` and `extraction-rules/` directories
- Small file count (~10 source files)
- Easy to navigate for current size
- Functions within files are cohesive

**Recommended structure benefits:**
- Clear feature boundaries
- Platform utilities reusable across packages
- Easier to add new extraction sources without modifying large files
- Better isolation for testing

**Migration risk:**
- Breaking changes to imports (though most are re-exported via index.ts)
- Increased directory depth
- May be over-engineering for current package size

## Conclusion

The `riviere-extract-ts` package shows better organization than a completely flat structure, with meaningful directory groupings (`predicates/`, `extraction-rules/`). The functions within each file are cohesive and operate on consistent state.

The main violations are:
1. Missing the features/platform/shell top-level structure
2. Generic string transforms not separated into platform/
3. Large extraction-rule evaluator file that could benefit from grouping by source

For a package of this size (~10 source files, ~600 lines), the current structure is maintainable. The existing directory organization demonstrates an understanding of separation of concerns, even without the full features/platform/shell hierarchy. If the package grows significantly (e.g., adding extractors for other languages), restructuring according to the recommended layout would improve maintainability.
