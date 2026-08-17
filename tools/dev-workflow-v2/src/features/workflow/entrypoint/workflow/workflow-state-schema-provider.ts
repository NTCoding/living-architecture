import type { ZodType } from 'zod'

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
