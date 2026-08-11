# entrypoint-cli-input-parser

## Purpose

Parses or validates raw CLI input using the meaning of a specific entrypoint.

## Behavioural Contract

1. Belongs to the entrypoint layer.
2. May coordinate multiple CLI options.
3. May produce entrypoint or application input types.
4. Does not own reusable domain validation rules.

## Canonical Example

Sharing does not change this role into `generic-cli-input-parser` and does not move it to infra. It changes only where the parser lives inside the entrypoint layer. Always choose the narrowest entrypoint scope containing every caller.

### Used by one entrypoint

Keep the parser beside that entrypoint:

```text
packages/riviere-cli/src/features/builder/entrypoint/link/
├── entrypoint.ts
└── link-source-location-options.ts
```

The real `parseLinkSourceLocation` function belongs here because it coordinates the Link command's `--repository`, `--file-path`, `--line-number`, and `--column-number` options and returns a `SourceLocation`:

```typescript
/** @riviere-role entrypoint-cli-input-parser */
export function parseLinkSourceLocation(
  options: LinkSourceLocationOptions,
): LinkSourceLocationResult {
  const hasLocationOption =
    options.repository !== undefined ||
    options.filePath !== undefined ||
    options.lineNumber !== undefined ||
    options.columnNumber !== undefined
  if (!hasLocationOption) {
    return { success: true, sourceLocation: undefined }
  }
  if (options.repository === undefined || options.filePath === undefined) {
    return {
      success: false,
      message: '--repository and --file-path are required when supplying a Link source location',
    }
  }

  const lineNumber = parsePositiveInteger(options.lineNumber, '--line-number')
  if (!lineNumber.success) return lineNumber

  const columnNumber = parsePositiveInteger(options.columnNumber, '--column-number')
  if (!columnNumber.success) return columnNumber

  return {
    success: true,
    sourceLocation: {
      repository: options.repository,
      filePath: options.filePath,
      ...(lineNumber.value !== undefined && { lineNumber: lineNumber.value }),
      ...(columnNumber.value !== undefined && { columnNumber: columnNumber.value }),
    },
  }
}
```

### Shared by entrypoints in one feature

Move the parser to that feature's private entrypoint platform:

```text
packages/riviere-cli/src/features/{feature}/entrypoint/_platform/cli/
├── input-parsers/
│   └── {parser}.ts
└── option-validators/
    └── {validator}.ts
```

For example, Builder's `validateLinkType` is used by the `link` and `link-external` entrypoints, while `validateHttpMethod` is used by the `link-http` entrypoint and its validator. These are Builder CLI option rules, so their common scope is:

```text
packages/riviere-cli/src/features/builder/entrypoint/_platform/cli/option-validators/
```

They must not move to `platform/infra/cli` merely because several Builder entrypoints call them.

### Shared by entrypoints in multiple features

Cross-feature code is no longer private to one feature's entrypoint location. Place it according to what it knows.

Domain-aware parsing and normalisation belongs in shared domain:

```text
packages/riviere-cli/src/platform/domain/component-types.ts
```

The real component-type functions are the example. Builder and Query entrypoints both use them, and they encode domain values including `UseCase`, `DomainOp`, and `EventHandler`. They therefore belong in `platform/domain/`, not generic CLI infrastructure.

Generic CLI parsing shared across features belongs in:

```text
packages/riviere-cli/src/platform/infra/cli/input/
```

It may work only with CLI and language primitives. There is no package-root `src/entrypoint/`; every entrypoint belongs to a feature.

### When generic infra is correct

Only extract the primitive mechanism, and only when it is genuinely reused. `link-source-location-options.ts` currently keeps this one-use primitive parser private:

```typescript
function parsePositiveInteger(
  raw: string | undefined,
  optionName: string,
):
  | { success: true; value: number | undefined }
  | { success: false; message: string }
```

Do not move that function to infra while it has one caller. If several unrelated entrypoints later need the same positive-integer conversion, extract only the conversion of `string | undefined` to a primitive success/failure value. The Link parser must still own which flags are related, which are required together, their option names and CLI error messages, and construction of `SourceLocation`. A generic primitive parser must never accept or return `LinkSourceLocationOptions`, `SourceLocation`, a command input, or another entrypoint/application type.

Do not extract a one-use primitive function merely to make the entrypoint file smaller. Keep it private beside its only caller until there is real reuse.

## Common Misclassifications

- Primitive conversion without entrypoint meaning is a `generic-cli-input-parser`.
- Reusable domain validation belongs to the domain that owns the rule.
- Reuse within one feature changes the `_platform` scope, not the role or location.
- Reuse across features requires `platform/domain/` for domain-aware code or `platform/infra/cli/input/` for generic parsing.

## Anti-Patterns

- Placing this role in an infrastructure layer.
- Labelling entrypoint-specific parsing as `generic-cli-input-parser`.
- Duplicating a parser in several entrypoints instead of moving it to their narrowest common entrypoint `_platform`.
- Moving a parser to infra solely because several entrypoints use it.
