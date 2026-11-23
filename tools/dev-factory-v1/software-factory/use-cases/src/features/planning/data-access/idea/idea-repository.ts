import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parse, stringify } from 'yaml'
import { Idea } from '@dev-factory-v1/domain-model/domain/planning/idea'

/** @riviere-role data-access-error */
export class IdeaFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IdeaFileError'
  }
}

const FRONT_MATTER = '---'

type IdeaFile = {
  readonly frontMatter: Readonly<Record<string, unknown>>
  readonly body: string
}

/**
 * @riviere-role aggregate-repository
 *
 * Reads and writes an idea in `project-memory/ideas/<slug>/idea.md`. The front matter is the part
 * the factory owns; the rest of the file is prose that the factory passes through untouched.
 */
export class IdeaRepository {
  constructor(private readonly targetRepo: string) {}

  load(ideaSlug: string): Idea {
    const file = fileOf(ideaSlug, this.read(ideaSlug))
    return Idea.from({
      title: stringOrEmpty(file.frontMatter['title']),
      status: stringOrEmpty(file.frontMatter['status']),
      need: stringOrEmpty(file.frontMatter['need']),
      epic: stringOrNull(file.frontMatter['epic']),
    })
  }

  create(ideaSlug: string, idea: Idea, summary: string): void {
    const path = this.pathOf(ideaSlug)
    mkdirSync(dirname(path), { recursive: true })
    const body = `**Source:** ${summary.trim()}\n`
    const temporaryPath = `${path}.${String(process.pid)}.tmp`
    writeFileSync(temporaryPath, textOf(idea, body), 'utf8')
    renameSync(temporaryPath, path)
  }

  save(ideaSlug: string, idea: Idea): void {
    const path = this.pathOf(ideaSlug)
    mkdirSync(dirname(path), { recursive: true })
    const body = bodyOf(path)
    const temporaryPath = `${path}.${String(process.pid)}.tmp`
    writeFileSync(temporaryPath, textOf(idea, body), 'utf8')
    renameSync(temporaryPath, path)
  }

  private read(ideaSlug: string): string {
    const path = this.pathOf(ideaSlug)
    try {
      return readFileSync(path, 'utf8')
    } catch {
      throw new IdeaFileError(`There is no idea.md for ${ideaSlug}.`)
    }
  }

  private pathOf(ideaSlug: string): string {
    if (!/^[a-z0-9-]+$/.test(ideaSlug)) {
      throw new IdeaFileError(
        `An idea folder is a slug of lower case letters, digits and dashes: ${ideaSlug}`,
      )
    }
    return join(this.targetRepo, 'project-memory', 'ideas', ideaSlug, 'idea.md')
  }
}

function bodyOf(path: string): string {
  try {
    return fileOf('the idea', readFileSync(path, 'utf8')).body
  } catch {
    return ''
  }
}

function fileOf(ideaSlug: string, text: string): IdeaFile {
  const lines = text.split('\n')
  const [opening] = lines
  if (opening?.trim() !== FRONT_MATTER) {
    throw new IdeaFileError(
      `The idea.md of ${ideaSlug} starts with its front matter between --- lines.`,
    )
  }
  const closing = lines.slice(1).findIndex((line) => line.trim() === FRONT_MATTER)
  if (closing === -1) {
    throw new IdeaFileError(`The front matter of ${ideaSlug} is never closed.`)
  }
  return {
    frontMatter: frontMatterOf(ideaSlug, lines.slice(1, closing + 1).join('\n')),
    body: lines.slice(closing + 2).join('\n'),
  }
}

function frontMatterOf(ideaSlug: string, text: string): Readonly<Record<string, unknown>> {
  try {
    const parsed: unknown = parse(text)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new IdeaFileError(`The front matter of ${ideaSlug} is a mapping.`)
    }
    return { ...parsed }
  } catch (error) {
    if (error instanceof IdeaFileError) throw error
    throw new IdeaFileError(`The front matter of ${ideaSlug} is not YAML: ${String(error)}`)
  }
}

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function textOf(idea: Idea, body: string): string {
  const fields = idea.toFields()
  const frontMatter = stringify({
    title: fields.title,
    status: fields.status,
    need: fields.need,
    epic: fields.epic,
  }).trimEnd()
  return [FRONT_MATTER, frontMatter, FRONT_MATTER, body].join('\n')
}
