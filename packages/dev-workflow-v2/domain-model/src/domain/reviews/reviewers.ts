import { z } from 'zod'

const REVIEWER_SCHEMA = z.enum([
  'architecture-review',
  'code-review',
  'bug-scanner',
  'task-check',
  'coderabbit',
] as const)

/** @riviere-role value-object */
export class Reviewers {
  declare private readonly brand: 'Reviewers'

  private constructor(readonly values: readonly z.infer<typeof REVIEWER_SCHEMA>[]) {}

  static parse(value: readonly string[]): Reviewers {
    return new Reviewers(REVIEWER_SCHEMA.array().parse(value))
  }

  static schema() {
    return REVIEWER_SCHEMA
  }
}
