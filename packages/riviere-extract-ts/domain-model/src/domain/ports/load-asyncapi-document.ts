type AsyncApiMessageRecord = Readonly<{
  id: string
  name: string
}>

type AsyncApiOperationRecord = Readonly<{
  id: string
  action: 'send' | 'receive'
  messageIds: readonly string[]
  hasReply: boolean
}>

type AsyncApiDocument = Readonly<{
  messages: readonly AsyncApiMessageRecord[]
  operations: readonly AsyncApiOperationRecord[]
}>

/**
 * @riviere-role domain-port
 * @riviere-role-justification The AsyncAPI document is an external specification fact read during Workflow stage behaviour, not aggregate state created earlier in the Project lifecycle, so it is not state that the Project repository should load as part of the aggregate.
 */
export type LoadAsyncApiDocument = (sourcePath: string) => Promise<AsyncApiDocument>

export type { AsyncApiDocument, AsyncApiMessageRecord, AsyncApiOperationRecord }
