import type { ZodType } from 'zod'

/** @riviere-role external-client-service */
export interface ZodSchemaProvider<TSchema extends ZodType> {
  schema(): TSchema
}

/** @riviere-role external-client-service */
export class StaticZodSchemaProvider<
  TSchema extends ZodType,
> implements ZodSchemaProvider<TSchema> {
  constructor(private readonly value: TSchema) {}

  schema(): TSchema {
    return this.value
  }
}
