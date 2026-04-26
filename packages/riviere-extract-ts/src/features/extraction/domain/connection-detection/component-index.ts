import type { EnrichedComponent } from '../value-extraction/enriched-component'

function locationKey(file: string, line: number): string {
  return `${file}:${line}`
}

/** @riviere-role value-object */
export class ComponentIndex {
  declare private brand: 'ComponentIndex'
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
    return this.byName.has(this.withoutGenericArguments(typeName))
  }

  getComponentByTypeName(typeName: string): EnrichedComponent | undefined {
    return this.byName.get(this.withoutGenericArguments(typeName))
  }

  getComponentByLocation(file: string, line: number): EnrichedComponent | undefined {
    return this.byLocation.get(locationKey(file, line))
  }

  private withoutGenericArguments(typeName: string): string {
    const index = typeName.indexOf('<')
    if (index === -1) {
      return typeName
    }

    return typeName.slice(0, index)
  }
}
