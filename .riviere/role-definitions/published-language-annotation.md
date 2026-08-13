# published-language-annotation

## Purpose

An annotation that forms part of a published language and is applied to source-code declarations.

## Canonical Example

```typescript
/** @riviere-role published-language-annotation */
export function UseCase<T>(target: T, context: ClassDecoratorContext): T {
  return target
}
```

Annotation factories are also valid:

```typescript
/** @riviere-role published-language-annotation */
export function HttpClient(
  serviceName: string,
): <T>(target: T, context: ClassDecoratorContext) => T {
  return (target) => target
}
```

## Anti-Patterns

- An ordinary exported function is not an annotation.
- A function that reads an annotation is not itself an annotation.
