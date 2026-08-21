import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(record: JsonRecord, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value !== '' ? value : undefined
}

function readSpawnParentThreadId(source: unknown): string | undefined {
  if (!isRecord(source)) return undefined

  const subagent = source['subagent']
  if (!isRecord(subagent)) return undefined

  const threadSpawn = subagent['thread_spawn']
  if (!isRecord(threadSpawn)) return undefined

  return readString(threadSpawn, 'parent_thread_id')
}

function readParentThreadId(payload: JsonRecord): string | undefined {
  const spawnParentThreadId = readSpawnParentThreadId(payload['source'])
  if (spawnParentThreadId !== undefined) return spawnParentThreadId

  return readString(payload, 'parent_thread_id') ?? readString(payload, 'forked_from_id')
}

function isSubagentSession(payload: JsonRecord): boolean {
  if (payload['thread_source'] === 'subagent') return true

  const source = payload['source']
  if (!isRecord(source)) return false
  const subagent = source['subagent']
  if (!isRecord(subagent)) return false

  return isRecord(subagent['thread_spawn'])
}

function findTranscriptPath(directory: string, threadId: string): string | undefined {
  if (!existsSync(directory)) return undefined

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      const transcriptPath = findTranscriptPath(path, threadId)
      if (transcriptPath !== undefined) return transcriptPath
      continue
    }

    if (entry.isFile() && entry.name.endsWith(`-${threadId}.jsonl`)) return path
  }

  return undefined
}

function readSessionMetadata(transcriptPath: string): JsonRecord | undefined {
  const firstLine = readFileSync(transcriptPath, 'utf8').split('\n')[0]
  if (firstLine === undefined || firstLine === '') return undefined

  const entry: unknown = JSON.parse(firstLine)
  if (!isRecord(entry) || entry['type'] !== 'session_meta' || !isRecord(entry['payload'])) {
    return undefined
  }

  return entry['payload']
}

/** @riviere-role external-client-error */
export class CodexSessionMetadataError extends Error {
  constructor(threadId: string) {
    super(`Codex subagent session ${threadId} is missing parent_thread_id metadata`)
    this.name = 'CodexSessionMetadataError'
  }
}

/** @riviere-role external-client-service */
export function readCodexParentThreadId(threadId: string, codexHome: string): string | undefined {
  const transcriptsDirectory = join(codexHome, 'sessions')
  const transcriptPath = findTranscriptPath(transcriptsDirectory, threadId)
  if (transcriptPath === undefined) return undefined

  const metadata = readSessionMetadata(transcriptPath)
  if (metadata === undefined) return undefined

  const parentThreadId = readParentThreadId(metadata)
  if (parentThreadId !== undefined) return parentThreadId
  if (isSubagentSession(metadata)) throw new CodexSessionMetadataError(threadId)

  return undefined
}
