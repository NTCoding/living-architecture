import type { AiExtractComponentDraft } from '@living-architecture/riviere-extract-config-published-language'
import { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'

type AiExtractCandidateIdParts = Readonly<{
  domain: string
  module: string
  type: AiExtractComponentDraft['type']
  name: string
}>

/**
 * @riviere-role value-object
 */
export class AiExtractCandidateId {
  declare private readonly brand: 'AiExtractCandidateId'
  private constructor(private readonly value: string) {}

  static fromDraft(draft: AiExtractComponentDraft): AiExtractCandidateId {
    return AiExtractCandidateId.fromParts({
      domain: draft.domain,
      module: draft.module,
      type: draft.type,
      name: draft.name,
    })
  }

  static fromParts(parts: AiExtractCandidateIdParts): AiExtractCandidateId {
    const componentId = ComponentId.parseFromParts({
      domain: parts.domain,
      module: parts.module,
      type: parts.type.toLowerCase(),
      name: parts.name,
    })
    return new AiExtractCandidateId(componentId.toString())
  }

  toString(): string {
    return this.value
  }
}
