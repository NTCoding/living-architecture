import { describe, expect, it } from 'vitest'
import { collaborators } from '../__fixtures__/workflow-fixtures'
import type { AsyncApiDocument } from '../ports/load-asyncapi-document'
import { asyncApiBuilder, asyncApiImportConfig } from './__fixtures__/asyncapi-stage-fixtures'
import { executeAsyncApiImportStage } from './execute-asyncapi-import-stage'

class DocumentLoadFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DocumentLoadFailure'
  }
}

const document: AsyncApiDocument = {
  messages: [{ id: 'OrderPlacedMessage', name: 'OrderPlacedMessage' }],
  operations: [
    { id: 'processOrder', action: 'send', messageIds: ['OrderPlacedMessage'], hasReply: false },
  ],
}

describe('executeAsyncApiImportStage failures', () => {
  it('reports a document load failure as a typed stage failure', async () => {
    const outcome = await executeAsyncApiImportStage(asyncApiBuilder(), asyncApiImportConfig(), {
      loadEventCatalogSource: () => Promise.resolve({ domains: [], services: [], events: [] }),
      loadAsyncApiDocument: () => Promise.reject(new DocumentLoadFailure('boom')),
      loadCodeExtraction: () => {
        throw new DocumentLoadFailure('Code extraction is not used by this fixture')
      },
      repositoryName: 'shop',
    })

    expect(outcome).toStrictEqual({
      success: false,
      errorCode: 'ASYNCAPI_IMPORT_FAILED',
      reason: 'AsyncAPI import failed: DocumentLoadFailure: boom',
    })
  })

  it('reports a builder failure as a typed stage failure', async () => {
    const outcome = await executeAsyncApiImportStage(
      asyncApiBuilder(),
      asyncApiImportConfig({
        mappings: {
          messages: {
            OrderPlacedMessage: {
              domain: 'missing',
              module: 'infrastructure',
              name: 'OrderPlaced',
            },
          },
          operations: {},
        },
      }),
      collaborators({ domains: [], services: [], events: [] }, document),
    )

    expect(outcome).toMatchObject({ success: false, errorCode: 'ASYNCAPI_IMPORT_FAILED' })
  })
})
