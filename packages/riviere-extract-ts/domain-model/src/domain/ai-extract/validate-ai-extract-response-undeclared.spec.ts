import { describe, expect, it } from 'vitest'

import type { AiExtractResponse } from '@living-architecture/riviere-extract-config-published-language'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import { validateAiExtractResponse } from './validate-ai-extract-response'

function builder() {
  return RiviereBuilder.parse({
    name: 'Shop',
    sources: [{ repository: 'shop' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } },
  })
}

function response(overrides: Partial<AiExtractResponse> = {}): AiExtractResponse {
  return { components: [], links: [], ...overrides }
}

function validate(subject: RiviereBuilder, input: { response: AiExtractResponse }) {
  return validateAiExtractResponse({
    builder: subject,
    config: {
      command: 'claude',
      args: [],
      timeoutSeconds: 60,
      sources: ['src/**/*.ts'],
      selection: { from: ['missing-events'], componentTypes: ['Event'] },
      outputs: { addComponents: true, addLinks: true },
      context: { exclude: [], maxFilesPerBatch: 10, maxBatches: 2 },
    },
    response: input.response,
    repositoryName: 'shop',
    sourcePaths: ['src/orders/checkout.ts'],
  })
}

describe('validateAiExtractResponse undeclared types', () => {
  it('rejects links with undeclared relationship types', () => {
    const result = validate(builder(), {
      response: response({
        links: [
          {
            source: 'orders:ordering:event:orderplaced',
            target: 'orders:ordering:usecase:placeorder',
            type: 'async',
            relationshipType: 'triggers',
          },
        ],
      }),
    })

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_UNKNOWN_RELATIONSHIP_TYPE',
      reason: 'AI extract writes undeclared relationship types: triggers',
    })
  })

  it('rejects custom components with undeclared custom types', () => {
    const result = validate(builder(), {
      response: response({
        components: [
          {
            type: 'Custom',
            name: 'OrderQueue',
            domain: 'orders',
            module: 'ordering',
            customTypeName: 'Queue',
          },
        ],
      }),
    })

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_UNKNOWN_CUSTOM_TYPE',
      reason: 'AI extract writes undeclared custom types: Queue',
    })
  })
})
