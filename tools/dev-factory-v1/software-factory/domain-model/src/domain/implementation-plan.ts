import { z } from 'zod'

const PLAN_ITEM_SCHEMA = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
})

const PLAN_ITEMS_SCHEMA = z.array(PLAN_ITEM_SCHEMA).min(1)

/** @riviere-role value-object */
export class PlanItem {
  declare private readonly brand: 'PlanItem'

  private constructor(
    private readonly name: string,
    private readonly description: string,
  ) {}

  static parse(value: unknown): PlanItem {
    const item = PLAN_ITEM_SCHEMA.parse(value)
    return new PlanItem(item.name, item.description)
  }

  section(numberInPlan: number): string {
    return [`### ${String(numberInPlan)}. ${this.name}`, '', this.description].join('\n')
  }
}

/** @riviere-role value-object */
export class ImplementationPlan {
  declare private readonly brand: 'ImplementationPlan'

  private constructor(private readonly items: PlanItem[]) {}

  static from(items: unknown[]): ImplementationPlan {
    return new ImplementationPlan(
      PLAN_ITEMS_SCHEMA.parse(items).map((item) => PlanItem.parse(item)),
    )
  }

  markdown(): string {
    return this.items.map((item, index) => item.section(index + 1)).join('\n\n')
  }
}
