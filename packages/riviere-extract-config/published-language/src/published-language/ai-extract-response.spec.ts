import { describe, expect, it } from 'vitest'
import { parseAiExtractResponse } from './ai-extract-response'
import {
  aiExtractResponse,
  apiComponentDraft,
  customComponentDraft,
  domainOpComponentDraft,
  eventComponentDraft,
  eventHandlerComponentDraft,
  internalLinkEntry,
  uiComponentDraft,
  useCaseComponentDraft,
} from './__fixtures__/ai-extract-response-fixtures'

describe('parseAiExtractResponse', () => {
  it('parses a minimal response containing one event component draft', () => {
    expect(
      parseAiExtractResponse(JSON.stringify(aiExtractResponse([eventComponentDraft()]))),
    ).toStrictEqual({
      success: true,
      response: {
        components: [eventComponentDraft()],
        links: [],
      },
    })
  })

  it('parses a response containing every component draft type and internal link entries', () => {
    const components = [
      uiComponentDraft(),
      apiComponentDraft(),
      useCaseComponentDraft(),
      domainOpComponentDraft(),
      eventComponentDraft(),
      eventHandlerComponentDraft(),
      customComponentDraft(),
    ]
    const links = [internalLinkEntry(), internalLinkEntry({ type: 'async' })]

    expect(
      parseAiExtractResponse(JSON.stringify(aiExtractResponse(components, links))),
    ).toStrictEqual({
      success: true,
      response: { components, links },
    })
  })

  it('accepts a response reporting no components and no links', () => {
    expect(parseAiExtractResponse(JSON.stringify(aiExtractResponse([])))).toStrictEqual({
      success: true,
      response: { components: [], links: [] },
    })
  })

  it('reports invalid JSON when the output is not parseable JSON', () => {
    const result = parseAiExtractResponse('not json')

    expect(result.success).toBe(false)
    expect(
      result.success === false && result.issues[0]?.startsWith('Response is not valid JSON:'),
    ).toBe(true)
  })

  it('labels a root-level validation issue with /', () => {
    const result = parseAiExtractResponse('[]')

    expect(result.success).toBe(false)
    expect(result.success === false && result.issues[0]?.startsWith('/:')).toBe(true)
  })

  it('rejects unrequested fields on the response', () => {
    const output = JSON.stringify({ components: [], links: [], confidence: 0.9 })
    const result = parseAiExtractResponse(output)

    expect(result.success).toBe(false)
    expect(result.success === false && result.issues[0]).toContain('confidence')
  })

  it('rejects unrequested fields on component drafts', () => {
    const output = JSON.stringify(
      aiExtractResponse([{ ...eventComponentDraft(), id: 'orders:ordering:Event:order-placed' }]),
    )
    const result = parseAiExtractResponse(output)

    expect(result.success).toBe(false)
    expect(result.success === false && result.issues[0]).toContain(
      'components.0: Unrecognized key: "id"',
    )
  })

  it('rejects unknown component types', () => {
    const output = JSON.stringify(aiExtractResponse([eventComponentDraft({ type: 'Saga' })]))
    const result = parseAiExtractResponse(output)

    expect(result.success).toBe(false)
    expect(result.success === false && result.issues[0]).toContain('components.0.type')
  })

  it('rejects drafts missing required fields for their component type', () => {
    const routeResult = parseAiExtractResponse(
      JSON.stringify(aiExtractResponse([{ ...uiComponentDraft(), route: undefined }])),
    )
    const eventNameResult = parseAiExtractResponse(
      JSON.stringify(aiExtractResponse([{ ...eventComponentDraft(), eventName: undefined }])),
    )

    expect(routeResult.success).toBe(false)
    expect(routeResult.success === false && routeResult.issues[0]).toContain('components.0.route')
    expect(eventNameResult.success).toBe(false)
    expect(eventNameResult.success === false && eventNameResult.issues[0]).toContain(
      'components.0.eventName',
    )
  })

  it('rejects empty required string fields', () => {
    const emptyResult = parseAiExtractResponse(
      JSON.stringify(aiExtractResponse([eventComponentDraft({ name: '' })])),
    )
    const whitespaceResult = parseAiExtractResponse(
      JSON.stringify(aiExtractResponse([eventComponentDraft({ name: '   ' })])),
    )

    expect(emptyResult.success).toBe(false)
    expect(emptyResult.success === false && emptyResult.issues[0]).toContain('components.0.name')
    expect(whitespaceResult.success).toBe(false)
    expect(whitespaceResult.success === false && whitespaceResult.issues[0]).toContain(
      'components.0.name',
    )
  })

  it('rejects internal link entries with unknown link kinds', () => {
    const output = JSON.stringify(
      aiExtractResponse([eventComponentDraft()], [internalLinkEntry({ type: 'tcp' })]),
    )
    const result = parseAiExtractResponse(output)

    expect(result.success).toBe(false)
    expect(result.success === false && result.issues[0]).toContain('links.0.type')
  })

  it('rejects internal link entries with empty identifiers', () => {
    const output = JSON.stringify(aiExtractResponse([], [internalLinkEntry({ source: '' })]))
    const result = parseAiExtractResponse(output)

    expect(result.success).toBe(false)
    expect(result.success === false && result.issues[0]).toContain('links.0.source')
  })

  it('rejects responses missing a declared collection', () => {
    const output = JSON.stringify({ links: [] })
    const result = parseAiExtractResponse(output)

    expect(result.success).toBe(false)
    expect(result.success === false && result.issues[0]).toContain('components')
  })

  it('rejects internal link entries carrying payload', () => {
    const output = JSON.stringify(
      aiExtractResponse([], [internalLinkEntry({ payload: { name: 'OrderPlaced' } })]),
    )
    const result = parseAiExtractResponse(output)

    expect(result.success).toBe(false)
    expect(result.success === false && result.issues[0]).toContain('links.0')
    expect(result.success === false && result.issues[0]).toContain('payload')
  })
})
