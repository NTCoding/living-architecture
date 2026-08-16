interface ComponentOutput {
  id: string
  type: string
  name: string
  domain: string
}

/** @riviere-role cli-output-formatter */
export function toComponentOutput(component: ComponentOutput): ComponentOutput {
  return {
    id: component.id,
    type: component.type,
    name: component.name,
    domain: component.domain,
  }
}
