type DraftComponentParameters = {
  type: string
  name: string
  location: { file: string; line: number }
  domain: string
  module: string
}
import { InvalidDraftComponentError } from './invalid-draft-component-error'

/** @riviere-role value-object */
export class DraftComponent {
  declare private brand: 'DraftComponent'
  readonly type: string
  readonly name: string
  readonly location: {
    file: string
    line: number
  }
  readonly domain: string
  readonly module: string

  static parse(
    params: unknown,
  ): { success: true; draftComponent: DraftComponent } | { success: false; error: string } {
    if (!isDraftComponentParameters(params))
      return { success: false, error: 'Invalid draft component' }
    return { success: true, draftComponent: new DraftComponent(params) }
  }

  static parseOrThrow(params: unknown): DraftComponent {
    const result = DraftComponent.parse(params)
    if (!result.success) throw new InvalidDraftComponentError(result.error)
    return result.draftComponent
  }

  static parseMany(values: unknown):
    | {
        success: true
        draftComponents: readonly DraftComponent[]
      }
    | { success: false; error: string } {
    if (!Array.isArray(values)) {
      return { success: false, error: 'Draft components file must contain an array' }
    }
    const components: DraftComponent[] = []
    for (const value of values) {
      const parsed = DraftComponent.parse(value)
      if (!parsed.success) return { success: false, error: parsed.error }
      components.push(parsed.draftComponent)
    }
    return { success: true, draftComponents: components }
  }

  private constructor(params: DraftComponentParameters) {
    this.type = params.type
    this.name = params.name
    this.location = params.location
    this.domain = params.domain
    this.module = params.module
  }
}

function isDraftComponentParameters(value: unknown): value is DraftComponentParameters {
  if (!isRecord(value)) return false
  const component = value
  const location = component['location']
  return (
    typeof component['type'] === 'string' &&
    typeof component['name'] === 'string' &&
    typeof component['domain'] === 'string' &&
    typeof component['module'] === 'string' &&
    isRecord(location) &&
    typeof location['file'] === 'string' &&
    typeof location['line'] === 'number'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}
