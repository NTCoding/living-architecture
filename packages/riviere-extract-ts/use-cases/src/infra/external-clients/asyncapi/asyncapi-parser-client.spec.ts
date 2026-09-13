import { describe, expect, it, vi } from 'vitest'
import { AsyncApiUnreadableError, readAsyncApiDocument } from './asyncapi-parser-client'

const parser = vi.hoisted(() => ({ parse: vi.fn() }))
const fileSystem = vi.hoisted(() => ({ readFileSync: vi.fn(() => 'asyncapi: 3.0.0') }))

class SourceReadFailure extends Error {
  constructor() {
    super('ENOENT')
    this.name = 'SourceReadFailure'
  }
}

vi.mock('@asyncapi/parser', () => ({
  Parser: class {
    parse = parser.parse
  },
}))

vi.mock('node:fs', () => ({ readFileSync: fileSystem.readFileSync }))

describe('readAsyncApiDocument', () => {
  it('maps parser messages and operations into client documents', async () => {
    parser.parse.mockResolvedValue({
      document: documentStub(),
      diagnostics: [],
    })

    const result = await readAsyncApiDocument('/specs/asyncapi.yaml')

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

  it('falls back to operationId when an operation has no id', async () => {
    parser.parse.mockResolvedValue({
      document: documentStub({ operationId: 'processOrder', id: undefined }),
      diagnostics: [],
    })

    const result = await readAsyncApiDocument('/specs/asyncapi.yaml')

    expect(result.operations.map((operation) => operation.id)).toStrictEqual(['processOrder'])
  })

  it('falls back to the message id when a message has no name', async () => {
    parser.parse.mockResolvedValue({
      document: documentStub({ messageName: undefined }),
      diagnostics: [],
    })

    const result = await readAsyncApiDocument('/specs/asyncapi.yaml')

    expect(result.messages.map((message) => message.name)).toStrictEqual(['OrderPlacedMessage'])
  })

  it.each([{ operationMessageName: 'ExternalMessage' }, { operationMessageName: undefined }])(
    'keeps an operation message id that is not a component message',
    async (options) => {
      parser.parse.mockResolvedValue({ document: documentStub(options), diagnostics: [] })

      const result = await readAsyncApiDocument('/specs/asyncapi.yaml')

      expect(result.operations[0]?.messageIds).toStrictEqual(['orderPlaced'])
    },
  )

  it('reports an operation with a reply', async () => {
    parser.parse.mockResolvedValue({
      document: documentStub({ hasReply: true }),
      diagnostics: [],
    })

    const result = await readAsyncApiDocument('/specs/asyncapi.yaml')

    expect(result.operations.map((operation) => operation.hasReply)).toStrictEqual([true])
  })

  it('fails when the parser reports an error diagnostic', async () => {
    parser.parse.mockResolvedValue({
      document: documentStub(),
      diagnostics: [{ severity: 0, message: 'required file not found' }],
    })

    await expect(readAsyncApiDocument('/specs/asyncapi.yaml')).rejects.toThrow(
      AsyncApiUnreadableError,
    )
  })

  it('fails when the parser produces no document', async () => {
    parser.parse.mockResolvedValue({ document: undefined, diagnostics: [] })

    await expect(readAsyncApiDocument('/specs/asyncapi.yaml')).rejects.toThrow(
      AsyncApiUnreadableError,
    )
  })

  it('fails when the source file cannot be read', async () => {
    fileSystem.readFileSync.mockImplementationOnce(() => {
      throw new SourceReadFailure()
    })

    await expect(readAsyncApiDocument('/missing/asyncapi.yaml')).rejects.toThrow(
      AsyncApiUnreadableError,
    )
  })

  it('fails when an operation has neither an id nor an operationId', async () => {
    parser.parse.mockResolvedValue({
      document: documentStub({ operationId: undefined, id: undefined }),
      diagnostics: [],
    })

    await expect(readAsyncApiDocument('/specs/asyncapi.yaml')).rejects.toThrow(
      AsyncApiUnreadableError,
    )
  })

  it.each(['publish', 'subscribe'] as const)(
    'fails when an operation uses the legacy %s action',
    async (action) => {
      parser.parse.mockResolvedValue({ document: documentStub({ action }), diagnostics: [] })

      await expect(readAsyncApiDocument('/specs/asyncapi.yaml')).rejects.toThrow(
        AsyncApiUnreadableError,
      )
    },
  )
})

type DocumentStubOptions = Readonly<{
  messageName?: string | undefined
  operationId?: string | undefined
  id?: string | undefined
  action?: 'send' | 'receive' | 'publish' | 'subscribe'
  hasReply?: boolean
  operationMessageName?: string | undefined
}>

function documentStub(options: DocumentStubOptions = {}) {
  return {
    components: () => ({ messages: () => ({ all: () => [messageStub(options)] }) }),
    operations: () => ({ all: () => [operationStub(options)] }),
  }
}

function messageStub(options: DocumentStubOptions) {
  return {
    id: () => 'OrderPlacedMessage',
    name: () =>
      Object.hasOwn(options, 'messageName') ? options.messageName : 'OrderPlacedMessage',
  }
}

function operationStub(options: DocumentStubOptions) {
  return {
    id: () => ('id' in options ? options.id : 'processOrder'),
    operationId: () => ('operationId' in options ? options.operationId : 'processOrder'),
    action: () => options.action ?? 'send',
    messages: () => ({
      all: () => [
        {
          id: () => 'orderPlaced',
          name: () =>
            Object.hasOwn(options, 'operationMessageName')
              ? options.operationMessageName
              : 'OrderPlacedMessage',
        },
      ],
    }),
    reply: () => (options.hasReply === true ? {} : undefined),
    jsonPath: () => '$.operations.processOrder',
  }
}
