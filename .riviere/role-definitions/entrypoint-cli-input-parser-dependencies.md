# entrypoint-cli-input-parser-dependencies

## Purpose

Defines the named collaborators supplied to a CLI input parser.

## Behavioural Contract

1. Belongs beside the CLI input parser that receives it.
2. Is an interface whose members reference real collaborators.
3. Does not declare inline function types. Reference a real function with `typeof` or a real class with its named type.

## Canonical Example

```typescript
/** @riviere-role external-client-service */
export function readWorkspaceFile(filePath: string): string {
  // implementation
}

/** @riviere-role entrypoint-cli-input-parser-dependencies */
export interface ExtractCliInputParserDependencies {
  readonly readWorkspaceFile: typeof readWorkspaceFile
}
```

## Common Misclassifications

A dependency interface is not CLI input data. Its members name the collaborators that a parser receives.

Do not recreate a collaborator API in a local type alias or interface. Define the collaborator in its own location with its actual role, then reference that named function or class here.

## Anti-Patterns

```typescript
/** @riviere-role entrypoint-cli-input-parser-dependencies */
export interface ExtractCliInputParserDependencies {
  readonly readWorkspaceFile: (filePath: string) => string
}
```

The inline type hides the collaborator's role and location. Define the collaborator first, give it its actual role, then reference it from this interface.
