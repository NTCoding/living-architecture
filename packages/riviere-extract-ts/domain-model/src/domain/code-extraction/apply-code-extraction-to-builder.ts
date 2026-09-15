import { ComponentDefinition, RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import type { OperationWarning } from '@living-architecture/riviere-builder-published-language'
import type { ExternalLink } from '@living-architecture/riviere-schema-published-language/schema'
import type { ExtractedLink } from '../connection-detection/extracted-link'
import type { EnrichedComponent } from '../value-extraction/enriched-component'

type ComponentDefinitionValue = ComponentDefinition['value']
type LinkInput = Parameters<RiviereBuilder['link']>[0]

type ComponentIdentity = Readonly<{
  type: string
  name: string
  domain: string
  module: string
}>

/**
 * @riviere-role domain-service
 * @riviere-role-justification This pure orchestration applies supplied extraction values to the Project-owned Builder; no state is loaded or retained by the operation.
 */
export function applyCodeExtractionToBuilder(
  builder: RiviereBuilder,
  repositoryName: string,
  components: readonly EnrichedComponent[],
  links: readonly ExtractedLink[],
  externalLinks: readonly ExternalLink[],
): readonly OperationWarning[] {
  applyComponents(builder, repositoryName, components)
  applyLinks(builder, links)
  return externalLinks.flatMap((link) =>
    builder.linkExternal({
      from: link.source,
      target: link.target,
      ...(link.type === undefined ? {} : { type: link.type }),
      ...(link.description === undefined ? {} : { description: link.description }),
      ...(link.sourceLocation === undefined ? {} : { sourceLocation: link.sourceLocation }),
    }).warnings,
  )
}

function applyComponents(
  builder: RiviereBuilder,
  repositoryName: string,
  components: readonly EnrichedComponent[],
): void {
  const existingComponentKeys = new Set(builder.components().map(componentKey))
  for (const component of components) {
    const definition = component.toComponentDefinition(repositoryName)
    if (!definition.success) continue
    const value = definition.data.value
    if (existingComponentKeys.has(definitionKey(value))) upsertDefinition(builder, value)
    else addDefinition(builder, value)
  }
}

function applyLinks(builder: RiviereBuilder, links: readonly ExtractedLink[]): void {
  const existingLinkKeys = new Set(
    builder.links().map((link) =>
      extractedLinkKey({
        from: link.source,
        to: link.target,
        ...(link.type === undefined ? {} : { type: link.type }),
        ...(link.sourceLocation === undefined ? {} : { sourceLocation: link.sourceLocation }),
      }),
    ),
  )
  for (const link of links) {
    if (link._uncertain !== undefined) continue
    const input = {
      from: link.source,
      to: link.target,
      ...(link.type === undefined ? {} : { type: link.type }),
      ...(link.sourceLocation === undefined ? {} : { sourceLocation: link.sourceLocation }),
    }
    if (existingLinkKeys.has(extractedLinkKey(input))) builder.upsertLink(input)
    else builder.link(input)
  }
}

function componentKey(component: ComponentIdentity): string {
  return `${component.type}|${component.name}|${component.domain}|${component.module}`
}

function definitionKey(value: ComponentDefinitionValue): string {
  return componentKey({
    type: value.type,
    name: value.input.name,
    domain: value.input.domain,
    module: value.input.module,
  })
}

function addDefinition(builder: RiviereBuilder, value: ComponentDefinitionValue): void {
  switch (value.type) {
    case 'UI':
      builder.addUI(value.input)
      return
    case 'API':
      builder.addApi(value.input)
      return
    case 'UseCase':
      builder.addUseCase(value.input)
      return
    case 'DomainOp':
      builder.addDomainOp(value.input)
      return
    case 'Event':
      builder.addEvent(value.input)
      return
    case 'EventHandler':
      builder.addEventHandler(value.input)
      return
    case 'Custom':
      builder.addCustom(value.input)
      return
  }
}

function upsertDefinition(builder: RiviereBuilder, value: ComponentDefinitionValue): void {
  switch (value.type) {
    case 'UI':
      builder.upsertUI(value.input, { noOverwrite: true })
      return
    case 'API':
      builder.upsertApi(value.input, { noOverwrite: true })
      return
    case 'UseCase':
      builder.upsertUseCase(value.input, { noOverwrite: true })
      return
    case 'DomainOp':
      builder.upsertDomainOp(value.input, { noOverwrite: true })
      return
    case 'Event':
      builder.upsertEvent(value.input, { noOverwrite: true })
      return
    case 'EventHandler':
      builder.upsertEventHandler(value.input, { noOverwrite: true })
      return
    case 'Custom':
      builder.upsertCustom(value.input, { noOverwrite: true })
      return
  }
}

function extractedLinkKey(link: LinkInput): string {
  const type = link.type ?? 'unspecified'
  const sourceLocation =
    link.sourceLocation === undefined ? 'no-source-location' : JSON.stringify(link.sourceLocation)
  return `${link.from}|${link.to}|${type}|${sourceLocation}`
}
