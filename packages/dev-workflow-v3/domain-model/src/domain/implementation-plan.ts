import { z } from 'zod'

const PLAN_SCHEMA = z.string().trim().min(1)

/** @riviere-role value-object */
export class ImplementationPlan {
  declare private readonly brand: 'ImplementationPlan'

  private constructor(private readonly planMarkdown: string) {}

  static parse(value: string): ImplementationPlan {
    return new ImplementationPlan(PLAN_SCHEMA.parse(value))
  }

  markdown(): string {
    return this.planMarkdown
  }
}
