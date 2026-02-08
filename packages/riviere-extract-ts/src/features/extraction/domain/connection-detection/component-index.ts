import type { EnrichedComponent } from '../value-extraction/enrich-components'
import { stripGenericArgs } from './call-graph/call-graph-types'

function locationKey(file: string, line: number): string {
  return `${file}:${line}`
}

export class ComponentIndex {
  private readonly byName: ReadonlyMap<string, EnrichedComponent>
  private readonly byLocation: ReadonlyMap<string, EnrichedComponent>

  constructor(components: readonly EnrichedComponent[]) {
    const nameMap = new Map<string, EnrichedComponent>()
    const locationMap = new Map<string, EnrichedComponent>()

    for (const component of components) {
      nameMap.set(component.name, component)
      locationMap.set(locationKey(component.location.file, component.location.line), component)
    }

    this.byName = nameMap
    this.byLocation = locationMap
  }

  isComponent(typeName: string): boolean {
    return this.byName.has(stripGenericArgs(typeName))
  }

  getComponentByTypeName(typeName: string): EnrichedComponent | undefined {
    return this.byName.get(stripGenericArgs(typeName))
  }

  getComponentByLocation(file: string, line: number): EnrichedComponent | undefined {
    return this.byLocation.get(locationKey(file, line))
  }
}
