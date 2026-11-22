import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parse, stringify } from 'yaml'
import { PlanningStep } from '@dev-factory-v1/domain-model/domain/planning/planning-step'
import { Epic } from '@dev-factory-v1/domain-model/domain/planning/epic'

type EpicStage =
  | { readonly kind: 'planning'; readonly step: PlanningStep }
  | { readonly kind: 'creating-stories' }
  | { readonly kind: 'in-progress' }
  | { readonly kind: 'done' }

type Feature = {
  readonly id: string
  readonly title: string
  readonly stories: readonly number[]
}

type EpicHistoryEntry = {
  readonly event: string
  readonly step: string | null
  readonly time: string
  readonly reason: string | null
}

/** @riviere-role data-access-error */
export class EpicFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EpicFileError'
  }
}

type EpicFile = {
  readonly title?: unknown
  readonly idea?: unknown
  readonly stage?: unknown
  readonly step?: unknown
  readonly history?: unknown
  readonly features?: unknown
}

/**
 * @riviere-role aggregate-repository
 *
 * Reads and writes the `epic.yml` of each epic under `docs/project/PRD/<slug>/` in the repo that
 * the factory works on. The server is the only writer of this file.
 */
export class EpicRepository {
  constructor(private readonly targetRepo: string) {}

  load(slug: string): Epic {
    return epicOf(slug, this.read(slug))
  }

  save(slug: string, epic: Epic): void {
    const path = this.pathOf(slug)
    mkdirSync(dirname(path), { recursive: true })
    const temporaryPath = `${path}.${String(process.pid)}.tmp`
    writeFileSync(temporaryPath, textOf(epic), 'utf8')
    renameSync(temporaryPath, path)
  }

  private pathOf(slug: string): string {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new EpicFileError(
        `An epic folder is a slug of lower case letters, digits and dashes: ${slug}`,
      )
    }
    return join(this.targetRepo, 'docs', 'project', 'PRD', slug, 'epic.yml')
  }

  private read(slug: string): string {
    const path = this.pathOf(slug)
    try {
      return readFileSync(path, 'utf8')
    } catch {
      throw new EpicFileError(`There is no epic.yml for ${slug}.`)
    }
  }
}

function epicOf(slug: string, text: string): Epic {
  const file = parseFile(slug, text)
  return Epic.from({
    title: stringOf(slug, file.title, 'title'),
    idea: file.idea === null || file.idea === undefined ? null : stringOf(slug, file.idea, 'idea'),
    stage: stageOf(slug, file),
    features: featuresOf(slug, file.features),
    history: historyOf(slug, file.history),
  })
}

function parseFile(slug: string, text: string): EpicFile {
  try {
    const parsed: unknown = parse(text)
    if (!isMapping(parsed)) {
      throw new EpicFileError(`The epic.yml of ${slug} is not a mapping.`)
    }
    return parsed
  } catch (error) {
    if (error instanceof EpicFileError) throw error
    throw new EpicFileError(`The epic.yml of ${slug} is not YAML: ${String(error)}`)
  }
}

function stageOf(slug: string, file: EpicFile): EpicStage {
  const stage = stringOf(slug, file.stage, 'stage')
  if (stage === 'planning') {
    const step = typeof file.step === 'string' ? file.step : ''
    return { kind: 'planning', step: PlanningStep.from(step) }
  }
  if (stage === 'creating-stories' || stage === 'in-progress' || stage === 'done') {
    return { kind: stage }
  }
  throw new EpicFileError(
    `The stage of ${slug} is one of planning, creating-stories, in-progress or done: ${stage}`,
  )
}

function featuresOf(slug: string, value: unknown): readonly Feature[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new EpicFileError(`The features of ${slug} are a list.`)
  return value.map((feature: unknown) => featureOf(slug, feature))
}

function featureOf(slug: string, value: unknown): Feature {
  if (!isMapping(value)) {
    throw new EpicFileError(`A feature of ${slug} is a mapping.`)
  }
  const stories = value['stories']
  return {
    id: stringOf(slug, value['id'], 'feature id'),
    title: stringOf(slug, value['title'], 'feature title'),
    stories: Array.isArray(stories)
      ? stories.filter((story): story is number => typeof story === 'number')
      : [],
  }
}

function historyOf(slug: string, value: unknown): readonly EpicHistoryEntry[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new EpicFileError(`The history of ${slug} is a list.`)
  return value.map((entry: unknown) => historyEntryOf(slug, entry))
}

function historyEntryOf(slug: string, value: unknown): EpicHistoryEntry {
  if (!isMapping(value)) {
    throw new EpicFileError(`An entry in the history of ${slug} is a mapping.`)
  }
  return {
    event: stringOf(slug, value['event'], 'event'),
    step: typeof value['step'] === 'string' ? value['step'] : null,
    time: stringOf(slug, value['time'], 'time'),
    reason: typeof value['reason'] === 'string' ? value['reason'] : null,
  }
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringOf(slug: string, value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new EpicFileError(`The ${field} of ${slug} is a non-empty string.`)
  }
  return value
}

function textOf(epic: Epic): string {
  const stage = epic.stage()
  return stringify({
    title: epic.title(),
    idea: epic.idea(),
    stage: stage.kind,
    ...(stage.kind === 'planning' ? { step: stage.step.name() } : {}),
    history: epic.history().map((entry) => ({
      event: entry.event,
      ...(entry.step === null ? {} : { step: entry.step }),
      time: entry.time,
      ...(entry.reason === null ? {} : { reason: entry.reason }),
    })),
    features: epic.features().map((feature) => ({
      id: feature.id,
      title: feature.title,
      stories: [...feature.stories],
    })),
  })
}
