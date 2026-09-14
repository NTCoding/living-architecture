import type { LoadAsyncApiDocument } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-asyncapi-document'
import { readAsyncApiDocument } from '../../../../infra/external-clients/asyncapi/asyncapi-parser-client'

/** @riviere-role domain-port-adapter */
export function createAsyncApiDocumentAdapter(): LoadAsyncApiDocument {
  return async (sourcePath) => {
    const document = await readAsyncApiDocument(sourcePath)
    return {
      messages: document.messages.map((message) => ({ id: message.id, name: message.name })),
      operations: document.operations.map((operation) => ({
        id: operation.id,
        action: operation.action,
        messageIds: [...operation.messageIds],
        hasReply: operation.hasReply,
      })),
    }
  }
}
