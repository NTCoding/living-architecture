import { describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ readAsyncApiDocument: vi.fn() }))

vi.mock('../../../../infra/external-clients/asyncapi/asyncapi-parser-client', () => ({
  readAsyncApiDocument: client.readAsyncApiDocument,
}))

import { createAsyncApiDocumentAdapter } from './asyncapi-document-adapter'

describe('createAsyncApiDocumentAdapter', () => {
  it('translates client messages and operations into the domain document', async () => {
    client.readAsyncApiDocument.mockResolvedValue({
      messages: [{ id: 'OrderPlacedMessage', name: 'OrderPlacedMessage' }],
      operations: [
        {
          id: 'processOrder',
          action: 'send',
          messageIds: ['OrderPlacedMessage'],
          hasReply: false,
        },
      ],
    })

    const result = await createAsyncApiDocumentAdapter()('/specs/asyncapi.yaml')

    expect(client.readAsyncApiDocument).toHaveBeenCalledWith('/specs/asyncapi.yaml')
    expect(result).toStrictEqual({
      messages: [{ id: 'OrderPlacedMessage', name: 'OrderPlacedMessage' }],
      operations: [
        {
          id: 'processOrder',
          action: 'send',
          messageIds: ['OrderPlacedMessage'],
          hasReply: false,
        },
      ],
    })
  })
})
