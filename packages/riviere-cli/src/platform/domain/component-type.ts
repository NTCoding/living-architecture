import { z } from 'zod'

const componentTypes = [
  'UI',
  'API',
  'UseCase',
  'DomainOp',
  'Event',
  'EventHandler',
  'Custom',
] as const
const componentTypeSchema = z.enum(componentTypes)
type ComponentTypeValue = z.infer<typeof componentTypeSchema>

/** @riviere-role value-object */
export class ComponentType {
  declare private readonly brand: 'ComponentType'
  readonly componentIdValue: string
  readonly value: ComponentTypeValue

  private constructor(value: ComponentTypeValue) {
    this.componentIdValue = value.toLowerCase()
    this.value = value
  }

  static parse(value: string) {
    const canonicalValue = componentTypes.find(
      (componentType) => componentType.toLowerCase() === value.toLowerCase(),
    )
    const parsed = componentTypeSchema.safeParse(canonicalValue)
    return parsed.success
      ? {
        data: new ComponentType(parsed.data),
        success: true as const,
      }
      : parsed
  }
}
