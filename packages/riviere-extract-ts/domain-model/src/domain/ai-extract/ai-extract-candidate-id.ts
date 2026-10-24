import { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'
import type { AiExtractComponentDraft } from '@living-architecture/riviere-extract-config-published-language'

/**
 * Canonical identity of a component an AI extraction response proposes.
 *
 * @riviere-role value-object
 */
export class AiExtractCandidateId {
  declare private readonly brand: 'AiExtractCandidateId'

  private constructor(private readonly value: ComponentId) {}

  static fromDraft(draft: AiExtractComponentDraft): AiExtractCandidateId {
    return new AiExtractCandidateId(
      ComponentId.parseFromParts({
        domain: draft.domain,
        module: draft.module,
        type: componentTypeName(draft.type),
        name: draft.name,
      }),
    )
  }

  toString(): string {
    return this.value.toString()
  }
}

function componentTypeName(draftType: AiExtractComponentDraft['type']): string {
  switch (draftType) {
    case 'UI':
      return 'ui'
    case 'API':
      return 'api'
    case 'UseCase':
      return 'usecase'
    case 'DomainOp':
      return 'domainop'
    case 'Event':
      return 'event'
    case 'EventHandler':
      return 'eventhandler'
    case 'Custom':
      return 'custom'
  }
}
