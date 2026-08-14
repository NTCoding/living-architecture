import type { ComponentId } from './component-id'

/** @riviere-role value-object */
export class ComponentDepths {
  declare private readonly brand: 'ComponentDepths'
  private readonly depths: ReadonlyMap<string, number>

  private constructor(depths: ReadonlyMap<string, number>) {
    this.depths = new Map(depths)
  }

  static parse(depths: ReadonlyMap<string, number>): ComponentDepths {
    return new ComponentDepths(depths)
  }

  get size(): number {
    return this.depths.size
  }

  get(componentId: ComponentId): number | undefined {
    return this.depths.get(componentId.value)
  }

  has(componentId: ComponentId): boolean {
    return this.depths.has(componentId.value)
  }
}
