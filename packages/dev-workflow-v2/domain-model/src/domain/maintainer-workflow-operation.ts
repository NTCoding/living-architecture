import { z, type ZodType } from 'zod'

const OPERATION_NAMES = [
  'record-issue',
  'record-branch',
  'record-reviewer-status',
  'create-pr',
  'wait-for-coderabbit-and-close-review-cycle',
] as const

const OPERATION_NAME_SCHEMA = z.enum(OPERATION_NAMES)

type MaintainerWorkflowOperationValue = z.infer<typeof OPERATION_NAME_SCHEMA>

/** @riviere-role domain-error */
export class InvalidMaintainerWorkflowOperation extends Error {
  constructor(value: string) {
    super(`Unknown maintainer workflow operation: ${value}`)
    this.name = 'InvalidMaintainerWorkflowOperation'
  }
}

/** @riviere-role value-object */
export class MaintainerWorkflowOperation {
  declare private readonly brand: 'MaintainerWorkflowOperation'

  private constructor(private readonly operation: MaintainerWorkflowOperationValue) {}

  static fromName(value: string): MaintainerWorkflowOperation {
    const result = OPERATION_NAME_SCHEMA.safeParse(value)
    if (!result.success) {
      throw new InvalidMaintainerWorkflowOperation(value)
    }
    return new MaintainerWorkflowOperation(result.data)
  }

  static parse(value: unknown): MaintainerWorkflowOperation {
    return new MaintainerWorkflowOperation(OPERATION_NAME_SCHEMA.parse(value))
  }

  name(): MaintainerWorkflowOperationValue {
    return this.operation
  }
}

/** @riviere-role value-object */
export class MaintainerWorkflowOperations {
  declare private readonly brand: 'MaintainerWorkflowOperations'

  private constructor(private readonly operations: readonly MaintainerWorkflowOperation[]) {}

  static singleton(): MaintainerWorkflowOperations {
    return new MaintainerWorkflowOperations(
      OPERATION_NAMES.map((name) => MaintainerWorkflowOperation.fromName(name)),
    )
  }

  asZodSchema(): ZodType<MaintainerWorkflowOperationValue> {
    return OPERATION_NAME_SCHEMA
  }

  all(): readonly MaintainerWorkflowOperation[] {
    return [...this.operations]
  }
}

export type { MaintainerWorkflowOperationValue }
