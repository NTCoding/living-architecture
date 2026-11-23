import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parse, stringify } from 'yaml'
import { Decision } from '@dev-factory-v1/domain-model/domain/planning/decision'

/** @riviere-role data-access-error */
export class DecisionFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DecisionFileError'
  }
}

type DecisionFile = {
  readonly id?: unknown
  readonly document?: unknown
  readonly question?: unknown
  readonly answer?: unknown
  readonly followed?: unknown
  readonly outcome?: unknown
}

/**
 * @riviere-role aggregate-repository
 *
 * Reads and writes the decision files of an epic, in `docs/project/PRD/<slug>/threads/`. A decision
 * shares that folder with the comment threads and is told apart by its `d-<n>` name. The server is
 * the only writer, so a decision is written whole and renamed into place.
 */
export class DecisionRepository {
  constructor(private readonly targetRepo: string) {}

  load(slug: string, decisionId: string): Decision {
    return decisionOf(decisionId, this.read(slug, decisionId))
  }

  save(slug: string, decision: Decision): void {
    const path = this.pathOf(slug, decision.id())
    mkdirSync(dirname(path), { recursive: true })
    const temporaryPath = `${path}.${String(process.pid)}.tmp`
    writeFileSync(temporaryPath, textOf(decision), 'utf8')
    renameSync(temporaryPath, path)
  }

  private read(slug: string, decisionId: string): string {
    const path = this.pathOf(slug, decisionId)
    try {
      return readFileSync(path, 'utf8')
    } catch {
      throw new DecisionFileError(`There is no decision ${decisionId} in ${slug}.`)
    }
  }

  private folder(slug: string): string {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new DecisionFileError(
        `An epic folder is a slug of lower case letters, digits and dashes: ${slug}`,
      )
    }
    return join(this.targetRepo, 'docs', 'project', 'PRD', slug, 'threads')
  }

  private pathOf(slug: string, decisionId: string): string {
    if (!/^d-\d+$/.test(decisionId)) {
      throw new DecisionFileError(`A decision file is named d-1.yml or d-2.yml: ${decisionId}`)
    }
    return join(this.folder(slug), `${decisionId}.yml`)
  }
}

function decisionOf(decisionId: string, text: string): Decision {
  const file = parseFile(decisionId, text)
  return Decision.from({
    id: decisionId,
    document: stringOf(decisionId, file.document, 'document'),
    question: stringOf(decisionId, file.question, 'question'),
    answer: answerOf(decisionId, file.answer),
    followed: file.followed === true,
    outcome: outcomeOf(decisionId, file.outcome),
  })
}

function parseFile(decisionId: string, text: string): DecisionFile {
  try {
    const parsed: unknown = parse(text)
    if (!isMapping(parsed)) {
      throw new DecisionFileError(`The file of ${decisionId} is not a mapping.`)
    }
    return { ...parsed, answer: parsed['answer'] ?? null, outcome: parsed['outcome'] ?? null }
  } catch (error) {
    if (error instanceof DecisionFileError) throw error
    throw new DecisionFileError(`The file of ${decisionId} is not YAML: ${String(error)}`)
  }
}

function answerOf(
  decisionId: string,
  value: unknown,
): {
  readonly choice: string
  readonly chosen: string
  readonly reply: string | null
  readonly time: string
} | null {
  if (value === null) return null
  if (!isMapping(value)) throw new DecisionFileError(`The answer of ${decisionId} is a mapping.`)
  return {
    choice: stringOf(decisionId, value['choice'], 'choice'),
    chosen: stringOf(decisionId, value['chosen'], 'chosen'),
    reply: typeof value['reply'] === 'string' ? value['reply'] : null,
    time: stringOf(decisionId, value['time'], 'time'),
  }
}

function outcomeOf(
  decisionId: string,
  value: unknown,
): { readonly closedBy: 'agent'; readonly time: string } | null {
  if (value === null) return null
  if (!isMapping(value)) throw new DecisionFileError(`The outcome of ${decisionId} is a mapping.`)
  const closedBy = stringOf(decisionId, value['closedBy'], 'closed by')
  if (closedBy !== 'agent') {
    throw new DecisionFileError(`The decision ${decisionId} is closed by the agent: ${closedBy}`)
  }
  return { closedBy, time: stringOf(decisionId, value['time'], 'time') }
}

function stringOf(decisionId: string, value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DecisionFileError(`The ${field} of ${decisionId} is a non-empty string.`)
  }
  return value
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function textOf(decision: Decision): string {
  const answer = decision.answer()
  const outcome = decision.outcome()
  return stringify({
    id: decision.id(),
    type: 'decision',
    document: decision.document(),
    question: decision.question(),
    answer:
      answer === null
        ? null
        : {
            choice: answer.choice(),
            chosen: answer.chosen(),
            reply: answer.reply(),
            time: answer.time(),
          },
    followed: decision.isFollowed(),
    outcome: outcome === null ? null : { closedBy: outcome.closedBy, time: outcome.time },
  })
}
