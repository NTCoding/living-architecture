import type { Component } from '@living-architecture/riviere-schema'

export interface ComponentOutput {
  id: string
  type: string
  name: string
  domain: string
}

export function toComponentOutput(component: Component): ComponentOutput {
  return {
    id: component.id,
    type: component.type,
    name: component.name,
    domain: component.domain,
  }
}
