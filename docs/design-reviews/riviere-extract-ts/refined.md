# Refined Design: riviere-extract-ts

This document presents the refined architecture after applying Separation of Concerns and Tactical DDD principles to the initial design.

---

## Package Overview

**Package:** `@living-architecture/riviere-extract-ts`
**Purpose:** TypeScript extractor for detecting architectural components from source code using ts-morph AST parsing

---

## Refined Structure

```text
packages/riviere-extract-ts/
└── src/
    ├── features/
    │   ├── component-extraction/
    │   │   ├── entrypoint/
    │   │   │   └── extract-draft-components.ts
    │   │   └── domain/
    │   │       ├── draft-component.ts
    │   │       ├── detection-target.ts
    │   │       ├── module-matching.ts
    │   │       └── component-creation.ts
    │   │
    │   ├── predicate-matching/
    │   │   └── domain/
    │   │       ├── matches-predicate.ts
    │   │       ├── decorator-predicates.ts
    │   │       ├── inheritance-predicates.ts
    │   │       ├── naming-predicates.ts
    │   │       └── composite-predicates.ts
    │   │
    │   ├── value-extraction/
    │   │   └── domain/
    │   │       ├── extraction-source.ts
    │   │       ├── extracted-value.ts
    │   │       ├── extract-from-class.ts
    │   │       ├── extract-from-method.ts
    │   │       ├── extract-from-decorator.ts
    │   │       └── extract-from-file.ts
    │   │
    │   └── config-resolution/
    │       └── domain/
    │           ├── resolve-module.ts
    │           ├── merge-custom-types.ts
    │           └── resolution-errors.ts
    │
    ├── platform/
    │   └── domain/
    │       ├── source-location/
    │       │   └── source-location.ts
    │       ├── string-transforms/
    │       │   ├── transforms.ts
    │       │   └── transform-pipeline.ts
    │       └── ast-literals/
    │           └── literal-detection.ts
    │
    └── shell/
        └── index.ts
```

---

## Feature: Component Extraction

### Entrypoint

**File:** `features/component-extraction/entrypoint/extract-draft-components.ts`

Thin mapping layer that invokes domain logic. Renamed from `extractComponents` to `extractDraftComponents` to clarify these are incomplete.

```typescript
export function extractDraftComponents(
  project: Project,
  sourceFilePaths: string[],
  config: ResolvedExtractionConfig,
  configDir?: string,
): DraftComponent[]
```

### Domain Types

**File:** `features/component-extraction/domain/draft-component.ts`

```typescript
export interface DraftComponent {
  type: string
  name: string
  location: SourceLocation
  domain: string
}
```

**File:** `features/component-extraction/domain/detection-target.ts`

Explicit type for what can be detected (previously implicit string array).

```typescript
export type DetectionTarget = 'classes' | 'methods' | 'functions'

export function isValidTarget(value: string): value is DetectionTarget {
  return value === 'classes' || value === 'methods' || value === 'functions'
}
```

---

## Feature: Predicate Matching

Renamed from "predicate-evaluation" to use domain language ("matching" is what predicates do).

### Domain

**File:** `features/predicate-matching/domain/matches-predicate.ts`

Main entry point renamed from `evaluatePredicate` to `matchesPredicate`.

```typescript
export function matchesPredicate(node: Node, predicate: Predicate): boolean
```

**File:** `features/predicate-matching/domain/decorator-predicates.ts`

```typescript
export function matchesHasDecorator(
  node: Node,
  decoratorName: string | string[],
  fromPackage?: string
): boolean
```

**File:** `features/predicate-matching/domain/inheritance-predicates.ts`

```typescript
export function matchesExtendsClass(node: Node, className: string): boolean
export function matchesImplementsInterface(node: Node, interfaceName: string): boolean
```

**File:** `features/predicate-matching/domain/naming-predicates.ts`

```typescript
export function matchesNameEndsWith(node: Node, suffix: string): boolean
export function matchesNameMatches(node: Node, pattern: string): boolean
```

**File:** `features/predicate-matching/domain/composite-predicates.ts`

```typescript
export function matchesAll(node: Node, predicates: Predicate[]): boolean
export function matchesAny(node: Node, predicates: Predicate[]): boolean
export function matchesInClassWith(node: Node, predicate: Predicate): boolean
```

---

## Feature: Value Extraction

Renamed functions from `evaluateFrom*Rule` to `extractFrom*` to use domain language.

### Domain Types

**File:** `features/value-extraction/domain/extraction-source.ts`

Explicit type for where extraction rules read from (previously implicit).

```typescript
export type ExtractionSource =
  | 'literal'
  | 'className'
  | 'methodName'
  | 'filePath'
  | 'property'
  | 'decoratorArg'
  | 'decoratorName'
  | 'methodSignature'
  | 'constructorParams'
  | 'parameterType'
  | 'genericArg'
```

**File:** `features/value-extraction/domain/extracted-value.ts`

Unified discriminated union for type safety (extending existing LiteralResult pattern).

```typescript
export type ExtractedValue =
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'strings'; value: string[] }
  | { kind: 'signature'; value: MethodSignature }
  | { kind: 'parameters'; value: ParameterInfo[] }

export interface MethodSignature {
  parameters: ParameterInfo[]
  returnType: string
}

export interface ParameterInfo {
  name: string
  type: string
}
```

### Extraction Functions

**File:** `features/value-extraction/domain/extract-from-class.ts`

```typescript
export function extractFromClassName(
  rule: FromClassNameExtractionRule,
  classDecl: ClassDeclaration
): ExtractedValue

export function extractFromProperty(
  rule: FromPropertyExtractionRule,
  classDecl: ClassDeclaration
): ExtractedValue

export function extractFromGenericArg(
  rule: FromGenericArgExtractionRule,
  classDecl: ClassDeclaration
): ExtractedValue

export function extractFromConstructorParams(
  rule: FromConstructorParamsExtractionRule,
  classDecl: ClassDeclaration
): ExtractedValue
```

**File:** `features/value-extraction/domain/extract-from-method.ts`

```typescript
export function extractFromMethodName(
  rule: FromMethodNameExtractionRule,
  methodDecl: MethodDeclaration
): ExtractedValue

export function extractFromMethodSignature(
  rule: FromMethodSignatureExtractionRule,
  methodDecl: MethodDeclaration
): ExtractedValue

export function extractFromParameterType(
  rule: FromParameterTypeExtractionRule,
  methodDecl: MethodDeclaration
): ExtractedValue
```

**File:** `features/value-extraction/domain/extract-from-decorator.ts`

```typescript
export function extractFromDecoratorArg(
  rule: FromDecoratorArgExtractionRule,
  decorator: Decorator
): ExtractedValue

export function extractFromDecoratorName(
  rule: FromDecoratorNameExtractionRule,
  decorator: Decorator
): ExtractedValue
```

**File:** `features/value-extraction/domain/extract-from-file.ts`

```typescript
export function extractFromFilePath(
  rule: FromFilePathExtractionRule,
  filePath: string
): ExtractedValue

export function extractLiteral(rule: LiteralExtractionRule): ExtractedValue
```

---

## Feature: Config Resolution

### Domain

**File:** `features/config-resolution/domain/resolve-module.ts`

```typescript
export type ConfigLoader = (source: string) => Module

export function resolveConfig(
  config: ExtractionConfig,
  loader?: ConfigLoader
): ResolvedExtractionConfig

export function resolveModule(
  moduleConfig: ModuleConfig,
  loader?: ConfigLoader
): Module
```

**File:** `features/config-resolution/domain/resolution-errors.ts`

```typescript
export class ConfigLoaderRequiredError extends Error {
  readonly moduleName: string
}

export class MissingComponentRuleError extends Error {
  readonly moduleName: string
  readonly ruleName: string
}
```

---

## Platform: Shared Domain Logic

### Source Location

**File:** `platform/domain/source-location/source-location.ts`

Value object eliminating repeated `{ file, line }` patterns across the codebase.

```typescript
export class SourceLocation {
  constructor(
    readonly file: string,
    readonly line: number
  ) {}

  toString(): string {
    return `${this.file}:${this.line}`
  }

  equals(other: SourceLocation): boolean {
    return this.file === other.file && this.line === other.line
  }
}
```

Used in:
- `DraftComponent.location`
- `ExtractionError.location`
- All extraction functions that report errors

### String Transforms

**File:** `platform/domain/string-transforms/transforms.ts`

Generic string transformations not specific to extraction.

```typescript
export function stripSuffix(value: string, suffix: string): string
export function stripPrefix(value: string, prefix: string): string
export function toLowerCase(value: string): string
export function toUpperCase(value: string): string
export function kebabToPascal(value: string): string
export function pascalToKebab(value: string): string
```

**File:** `platform/domain/string-transforms/transform-pipeline.ts`

Makes transform composition explicit.

```typescript
export function applyTransforms(value: string, transform: Transform): string
```

### AST Literals

**File:** `platform/domain/ast-literals/literal-detection.ts`

Generic AST literal extraction for any ts-morph-based tool.

```typescript
export class ExtractionError extends Error {
  readonly location: SourceLocation
}

export function isLiteralValue(expression: Expression | undefined): boolean

export type LiteralResult =
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'boolean'; value: boolean }

export function extractLiteralValue(
  expression: Expression | undefined,
  location: SourceLocation
): LiteralResult
```

---

## Shell: Public API

**File:** `shell/index.ts`

Single public API surface that composes features.

```typescript
export { extractDraftComponents } from '../features/component-extraction/entrypoint/extract-draft-components'
export type { DraftComponent } from '../features/component-extraction/domain/draft-component'

export { resolveConfig } from '../features/config-resolution/domain/resolve-module'
export type { ConfigLoader } from '../features/config-resolution/domain/resolve-module'

export { matchesPredicate } from '../features/predicate-matching/domain/matches-predicate'

export {
  extractFromClassName,
  extractFromProperty,
  extractFromGenericArg,
  extractFromConstructorParams,
} from '../features/value-extraction/domain/extract-from-class'

export {
  extractFromMethodName,
  extractFromMethodSignature,
  extractFromParameterType,
} from '../features/value-extraction/domain/extract-from-method'

export {
  extractFromDecoratorArg,
  extractFromDecoratorName,
} from '../features/value-extraction/domain/extract-from-decorator'

export {
  extractFromFilePath,
  extractLiteral,
} from '../features/value-extraction/domain/extract-from-file'

export type { ExtractedValue, MethodSignature, ParameterInfo } from '../features/value-extraction/domain/extracted-value'
export type { ExtractionSource } from '../features/value-extraction/domain/extraction-source'
export type { DetectionTarget } from '../features/component-extraction/domain/detection-target'

export { SourceLocation } from '../platform/domain/source-location/source-location'
export { ExtractionError } from '../platform/domain/ast-literals/literal-detection'
export { ConfigLoaderRequiredError, MissingComponentRuleError } from '../features/config-resolution/domain/resolution-errors'
```

---

## Key Improvements

### Separation of Concerns

| Before | After | Principle |
|--------|-------|-----------|
| Flat src/ with predicates/, extraction-rules/ | features/, platform/, shell/ structure | P1: Top-level structure |
| transforms.ts in extraction-rules/ | platform/domain/string-transforms/ | P2: Shared capabilities |
| literal-detection.ts in extraction-rules/ | platform/domain/ast-literals/ | P2: Shared capabilities |
| Mixed helper functions | Grouped by abstraction level | P3: Intent vs execution |

### Tactical DDD

| Before | After | Principle |
|--------|-------|-----------|
| `evaluatePredicate()` | `matchesPredicate()` | P2: Domain language |
| `evaluateFrom*Rule()` | `extractFrom*()` | P2: Domain language |
| `extractComponents()` | `extractDraftComponents()` | P2: Domain language |
| `{ file, line }` everywhere | `SourceLocation` value object | P8: Value objects |
| Implicit `DetectionTarget` | Explicit type | P6: Make implicit explicit |
| Implicit `ExtractionSource` | Explicit type | P6: Make implicit explicit |
| Mixed `ExtractionResult` types | Unified `ExtractedValue` union | P6: Make implicit explicit |

---

## Migration Notes

### Breaking Changes

1. **Entry point renamed:** `extractComponents` -> `extractDraftComponents`
2. **Predicate function renamed:** `evaluatePredicate` -> `matchesPredicate`
3. **Extraction functions renamed:** `evaluateFrom*Rule` -> `extractFrom*`
4. **Import paths changed:** All imports from `@living-architecture/riviere-extract-ts` (shell handles re-exports)

### Non-Breaking Changes

1. Internal file reorganization (shell re-exports maintain compatibility)
2. New types added: `DetectionTarget`, `ExtractionSource`, `ExtractedValue`
3. `SourceLocation` value object (replaces inline objects)

### Incremental Adoption Path

1. **Phase 1:** Add `SourceLocation` value object, update usages
2. **Phase 2:** Rename functions to domain language
3. **Phase 3:** Add explicit types (`DetectionTarget`, `ExtractionSource`)
4. **Phase 4:** Restructure into features/platform/shell
5. **Phase 5:** Update public exports in shell/index.ts

---

## Trade-offs

### Current Size Consideration

The package is ~600 lines across ~10 files. The full structure adds directory depth but:

- **Benefits:** Clear boundaries, reusable platform utilities, explicit domain concepts
- **Costs:** More files to navigate, deeper import paths (mitigated by shell re-exports)

### Functional vs Object-Oriented

The refined design maintains the functional approach (no classes with methods) because:

- Extraction is stateless: input file -> output components
- No aggregates with invariants to protect
- Functions compose naturally for the transformation pipeline

The `SourceLocation` class is the exception - a true value object where identity matters.

---

## Checklist Verification

### Separation of Concerns

- [x] features/, platform/, shell/ exist at root
- [x] platform/ contains only domain/ (no infra needed for this package)
- [x] features contain domain/ (entrypoint/ only where needed)
- [x] shell/ contains no business logic
- [x] Feature-specific code in features/
- [x] Shared logic in platform/domain/
- [x] Functions in files share same state
- [x] File names relate to directory
- [x] Directory names describe contents
- [x] No generic type-grouping files

### Tactical DDD

- [x] Domain isolated from infrastructure
- [x] Names from domain, not jargon
- [x] Business logic in domain objects/functions
- [x] Hidden concepts extracted and named
- [x] Values extracted into value objects where appropriate
