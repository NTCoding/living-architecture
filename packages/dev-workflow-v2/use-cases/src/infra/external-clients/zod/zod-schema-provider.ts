import type { ZodType } from 'zod'

/** @riviere-role external-client-service */
export class ZodSchemaProvider<T> {
  constructor(private readonly schema: ZodType<T>) {}

  getSchema(): ZodType<T> {
    return this.schema
  }
}
