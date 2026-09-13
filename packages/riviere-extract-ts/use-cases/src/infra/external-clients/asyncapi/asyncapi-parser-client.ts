import { readFileSync } from 'node:fs'
import { Parser, type AsyncAPIDocumentInterface } from '@asyncapi/parser'
/** @riviere-role external-client-model */
export interface AsyncApiMessageDocument {
  readonly id: string
  readonly name: string
}

/** @riviere-role external-client-model */
export interface AsyncApiOperationDocument {
  readonly id: string
  readonly action: 'send' | 'receive'
  readonly messageIds: readonly string[]
  readonly hasReply: boolean
}

/** @riviere-role external-client-model */
export interface AsyncApiDocumentResult {
  readonly messages: readonly AsyncApiMessageDocument[]
  readonly operations: readonly AsyncApiOperationDocument[]
}

/** @riviere-role external-client-error */
export class AsyncApiUnreadableError extends Error {
  constructor(sourcePath: string, cause: string) {
    super(`AsyncAPI document at '${sourcePath}' could not be read: ${cause}`)
    this.name = 'AsyncApiUnreadableError'
  }
}

/** @riviere-role external-client-service */
export async function readAsyncApiDocument(sourcePath: string): Promise<AsyncApiDocumentResult> {
  const parser = new Parser()
  const parsed = await parser.parse(readSource(sourcePath))
  if (parsed.diagnostics.some((diagnostic) => diagnostic.severity === 0)) {
    throw new AsyncApiUnreadableError(
      sourcePath,
      parsed.diagnostics.map((diagnostic) => diagnostic.message).join('; '),
    )
  }
  if (parsed.document === undefined) {
    throw new AsyncApiUnreadableError(sourcePath, 'parser produced no document')
  }
  return {
    messages: documentMessages(parsed.document),
    operations: documentOperations(parsed.document),
  }
}

function readSource(sourcePath: string): string {
  try {
    return readFileSync(sourcePath, 'utf-8')
  } catch (error) {
    throw new AsyncApiUnreadableError(sourcePath, String(error))
  }
}

function documentMessages(document: AsyncAPIDocumentInterface): readonly AsyncApiMessageDocument[] {
  return document
    .components()
    .messages()
    .all()
    .map((message) => ({
      id: message.id(),
      name: message.name() ?? message.id(),
    }))
}

function documentOperations(
  document: AsyncAPIDocumentInterface,
): readonly AsyncApiOperationDocument[] {
  const componentKeyByReference = componentKeyByReferenceId(document)
  return document
    .operations()
    .all()
    .map((operation) => ({
      id: operationId(operation),
      action: operationAction(operation),
      messageIds: operation
        .messages()
        .all()
        .map((message) => canonicalMessageId(componentKeyByReference, message)),
      hasReply: operation.reply() !== undefined,
    }))
}

function componentKeyByReferenceId(
  document: AsyncAPIDocumentInterface,
): ReadonlyMap<string, string> {
  const componentKeyByReference = new Map<string, string>()
  for (const message of document.components().messages().all()) {
    componentKeyByReference.set(message.name() ?? message.id(), message.id())
  }
  return componentKeyByReference
}

function canonicalMessageId(
  componentKeyByReference: ReadonlyMap<string, string>,
  message: { id(): string; name(): string | undefined },
): string {
  return componentKeyByReference.get(message.name() ?? message.id()) ?? message.id()
}

function operationAction(operation: {
  action(): 'send' | 'receive' | 'publish' | 'subscribe'
  jsonPath(): string
}): 'send' | 'receive' {
  const action = operation.action()
  if (action === 'publish' || action === 'subscribe') {
    throw new AsyncApiUnreadableError(
      operation.jsonPath(),
      `operation action '${action}' is AsyncAPI v2; Phase 13 supports v3 send/receive`,
    )
  }
  return action
}

function operationId(operation: {
  id(): string | undefined
  operationId(): string | undefined
  jsonPath(): string
}): string {
  const id = operation.id() ?? operation.operationId()
  if (id === undefined) {
    throw new AsyncApiUnreadableError(
      operation.jsonPath(),
      'operation has neither an id nor an operationId',
    )
  }
  return id
}
