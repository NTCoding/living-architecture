import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readAsyncApiDocument } from './asyncapi-parser-client'

const fixturePath = fileURLToPath(new URL('./__fixtures__/asyncapi.yaml', import.meta.url))

describe('readAsyncApiDocument with the real parser', () => {
  it('reads a valid AsyncAPI v3 document into messages and operations', async () => {
    const result = await readAsyncApiDocument(fixturePath)

    expect(result.messages).toStrictEqual([
      { id: 'OrderPlacedMessage', name: 'OrderPlacedMessage' },
    ])
    expect(result.operations).toStrictEqual([
      {
        id: 'processOrder',
        action: 'send',
        messageIds: ['OrderPlacedMessage'],
        hasReply: false,
      },
    ])
  })
})
