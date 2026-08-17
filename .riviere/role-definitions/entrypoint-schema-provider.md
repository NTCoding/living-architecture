# entrypoint-schema-provider

## Purpose

Supplies a schema that a CLI entrypoint needs to configure its framework boundary.

## Behavioural Contract

1. Belongs beside the entrypoint that consumes the schema.
2. Hides the schema implementation behind a small provider interface.
3. Is constructed by the composition root from an already configured schema.
4. Does not parse CLI input, execute a use case, or perform I/O.

## Example

```typescript
/** @riviere-role entrypoint-schema-provider */
export interface WorkflowStateSchemaProvider {
  stateNameSchema(): ZodType<string>
}

/** @riviere-role entrypoint-schema-provider */
export class ZodWorkflowStateSchemaProvider implements WorkflowStateSchemaProvider {
  constructor(private readonly schema: ZodType<string>) {}

  stateNameSchema(): ZodType<string> {
    return this.schema
  }
}
```

## Anti-Patterns

- Passing a raw schema into a CLI entrypoint dependencies object.
- Adding CLI option values to a CLI entrypoint dependencies object.
- Putting schema provider implementation in the composition root.
