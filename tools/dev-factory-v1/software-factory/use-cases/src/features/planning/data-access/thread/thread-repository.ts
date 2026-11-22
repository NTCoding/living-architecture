import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parse, stringify } from 'yaml'
import { Thread } from '@dev-factory-v1/domain-model/domain/planning/thread'

type ThreadAnchor = {
  readonly selectedText: string
  readonly prefix: string
  readonly suffix: string
  readonly firstLine: number
  readonly occurrence: number
}

/** @riviere-role data-access-error */
export class ThreadFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ThreadFileError'
  }
}

type ThreadFile = {
  readonly id?: unknown
  readonly type?: unknown
  readonly document?: unknown
  readonly anchor?: unknown
  readonly waitsFor?: unknown
  readonly outcome?: unknown
  readonly messages?: unknown
}

/**
 * @riviere-role aggregate-repository
 *
 * Reads and writes the thread files of an epic, in `docs/project/PRD/<slug>/threads/`. The server
 * is the only writer, so a thread is written whole and renamed into place.
 */
export class ThreadRepository {
  constructor(private readonly targetRepo: string) {}

  load(slug: string, threadId: string): Thread {
    return threadOf(threadId, this.read(slug, threadId))
  }

  save(slug: string, thread: Thread): void {
    const path = this.pathOf(slug, thread.id())
    mkdirSync(dirname(path), { recursive: true })
    const temporaryPath = `${path}.${String(process.pid)}.tmp`
    writeFileSync(temporaryPath, textOf(thread), 'utf8')
    renameSync(temporaryPath, path)
  }

  private read(slug: string, threadId: string): string {
    const path = this.pathOf(slug, threadId)
    try {
      return readFileSync(path, 'utf8')
    } catch {
      throw new ThreadFileError(`There is no thread ${threadId} in ${slug}.`)
    }
  }

  private folder(slug: string): string {
    return join(this.targetRepo, 'docs', 'project', 'PRD', epicFolderOf(slug), 'threads')
  }

  private pathOf(slug: string, threadId: string): string {
    const folder = this.folder(slug)
    if (!/^c-\d+$/.test(threadId)) {
      throw new ThreadFileError(`A thread file is named c-1.yml or c-2.yml: ${threadId}`)
    }
    return join(folder, `${threadId}.yml`)
  }
}

function epicFolderOf(slug: string): string {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new ThreadFileError(
      `An epic folder is a slug of lower case letters, digits and dashes: ${slug}`,
    )
  }
  return slug
}

function threadOf(threadId: string, text: string): Thread {
  const file = parseFile(threadId, text)
  return Thread.from({
    id: threadId,
    document: stringOf(threadId, file.document, 'document'),
    anchor: anchorOf(threadId, file.anchor),
    messages: messagesOf(threadId, file.messages),
    outcome: outcomeOf(threadId, file.outcome),
  })
}

function parseFile(threadId: string, text: string): ThreadFile {
  try {
    const parsed: unknown = parse(text)
    if (!isMapping(parsed)) throw new ThreadFileError(`The file of ${threadId} is not a mapping.`)
    return {
      id: parsed['id'],
      type: parsed['type'],
      document: parsed['document'],
      anchor: parsed['anchor'],
      waitsFor: parsed['waitsFor'],
      outcome: parsed['outcome'],
      messages: parsed['messages'],
    }
  } catch (error) {
    if (error instanceof ThreadFileError) throw error
    throw new ThreadFileError(`The file of ${threadId} is not YAML: ${String(error)}`)
  }
}

function anchorOf(threadId: string, value: unknown): ThreadAnchor {
  if (!isMapping(value)) throw new ThreadFileError(`The anchor of ${threadId} is a mapping.`)
  return {
    selectedText: stringOf(threadId, value['selectedText'], 'selected text'),
    prefix: typeof value['prefix'] === 'string' ? value['prefix'] : '',
    suffix: typeof value['suffix'] === 'string' ? value['suffix'] : '',
    firstLine: typeof value['firstLine'] === 'number' ? value['firstLine'] : 1,
    occurrence: typeof value['occurrence'] === 'number' ? value['occurrence'] : 0,
  }
}

function messagesOf(
  threadId: string,
  value: unknown,
): readonly { readonly author: string; readonly time: string; readonly text: string }[] {
  if (!Array.isArray(value)) throw new ThreadFileError(`The messages of ${threadId} are a list.`)
  return value.map((message: unknown) => messageOf(threadId, message))
}

function messageOf(
  threadId: string,
  value: unknown,
): { readonly author: string; readonly time: string; readonly text: string } {
  if (!isMapping(value)) throw new ThreadFileError(`A message of ${threadId} is a mapping.`)
  return {
    author: stringOf(threadId, value['author'], 'author'),
    time: stringOf(threadId, value['time'], 'time'),
    text: stringOf(threadId, value['text'], 'text'),
  }
}

function outcomeOf(
  threadId: string,
  value: unknown,
): { readonly closedBy: string; readonly time: string } | null {
  if (value === null || value === undefined) return null
  if (!isMapping(value)) throw new ThreadFileError(`The outcome of ${threadId} is a mapping.`)
  return {
    closedBy: stringOf(threadId, value['closedBy'], 'closed by'),
    time: stringOf(threadId, value['time'], 'time'),
  }
}

function stringOf(threadId: string, value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ThreadFileError(`The ${field} of ${threadId} is a non-empty string.`)
  }
  return value
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function textOf(thread: Thread): string {
  const outcome = thread.outcome()
  return stringify({
    id: thread.id(),
    type: 'comment',
    document: thread.document(),
    anchor: thread.anchor(),
    waitsFor: thread.waitsFor(),
    outcome: outcome === null ? null : { closedBy: outcome.closedBy, time: outcome.time },
    messages: thread.messages().map((message) => ({
      author: message.author,
      time: message.time,
      text: message.text,
    })),
  })
}
