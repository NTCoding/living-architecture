import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import { InvalidDefinitionDocument } from './extensions/behaviors/maintainer-git-errors'

const SWAMP_DIR = import.meta.dirname
const WORKFLOW_DIR = join(SWAMP_DIR, 'workflows')
const DEFINITION_PATH = join(
  SWAMP_DIR,
  'models',
  '@swamp',
  'software-factory',
  'maintainer-factory.yaml',
)

const FACTORY_NAME = 'maintainer-factory'
const BEHAVIOUR_NAME = 'maintainer-git'

interface Stage {
  readonly id: string
  readonly initial: boolean
  readonly terminal: boolean
  readonly workflowName: string | undefined
  readonly workMode: string | undefined
  readonly resultEvidence: string | undefined
  readonly workflowInputs: readonly string[]
  readonly artifacts: readonly string[]
  readonly evidence: readonly string[]
  readonly transitions: readonly Transition[]
}

interface Transition {
  readonly name: string
  readonly to: string
  readonly gates: readonly Gate[]
}

interface Gate {
  readonly type: string
  readonly artifact: string | undefined
  readonly evidence: string | undefined
  readonly workflow: string | undefined
}

interface Workflow {
  readonly file: string
  readonly id: string
  readonly name: string
  readonly jobNames: readonly string[]
  readonly stepNames: readonly string[]
  readonly requiredInputs: readonly string[]
  readonly behavioursCalled: readonly string[]
  readonly behaviourMethodCalls: readonly string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readList(record: Record<string, unknown>, key: string): readonly unknown[] {
  const value = record[key]
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new InvalidDefinitionDocument(`expected a list at ${key}`)
  }
  return value
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new InvalidDefinitionDocument(`expected a string at ${key}`)
  }
  return value
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

function readOptionalRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const value = record[key]
  return isRecord(value) ? value : undefined
}

function readRecords(
  record: Record<string, unknown>,
  key: string,
): readonly Record<string, unknown>[] {
  return readList(record, key).filter(isRecord)
}

function readRequired(value: string | undefined, key: string): string {
  if (value === undefined) {
    throw new InvalidDefinitionDocument(`missing ${key}`)
  }
  return value
}

function namesOf(records: readonly Record<string, unknown>[]): readonly string[] {
  return records.map((entry) => readString(entry, 'name'))
}

function readGate(record: Record<string, unknown>): Gate {
  const config = readOptionalRecord(record, 'config')
  return {
    type: readString(record, 'type'),
    artifact: config === undefined ? undefined : readOptionalString(config, 'artifact'),
    evidence: config === undefined ? undefined : readOptionalString(config, 'name'),
    workflow: config === undefined ? undefined : readOptionalString(config, 'workflow'),
  }
}

function readTransition(record: Record<string, unknown>): Transition {
  return {
    name: readString(record, 'name'),
    to: readString(record, 'to'),
    gates: readRecords(record, 'gates').map(readGate),
  }
}

function readStage(record: Record<string, unknown>): Stage {
  const work = readOptionalRecord(record, 'work')
  const workflow = work === undefined ? undefined : readOptionalRecord(work, 'workflow')
  const workflowInputs = workflow === undefined ? undefined : readOptionalRecord(workflow, 'inputs')
  return {
    id: readString(record, 'id'),
    initial: record['initial'] === true,
    terminal: record['terminal'] === true,
    workMode: work === undefined ? undefined : readOptionalString(work, 'mode'),
    resultEvidence: work === undefined ? undefined : readOptionalString(work, 'resultEvidence'),
    workflowName: workflow === undefined ? undefined : readOptionalString(workflow, 'name'),
    workflowInputs: workflowInputs === undefined ? [] : Object.keys(workflowInputs),
    artifacts: namesOf(readRecords(record, 'artifacts')),
    evidence: namesOf(readRecords(record, 'evidence')),
    transitions: readRecords(record, 'transitions').map(readTransition),
  }
}

function readFactory(): readonly Stage[] {
  const document: unknown = parse(readFileSync(DEFINITION_PATH, 'utf8'))
  if (!isRecord(document)) {
    throw new InvalidDefinitionDocument('the factory definition is not a mapping')
  }
  const globalArguments = readOptionalRecord(document, 'globalArguments')
  if (globalArguments === undefined) {
    throw new InvalidDefinitionDocument('the definition has no globalArguments')
  }
  return readRecords(globalArguments, 'stages').map(readStage)
}

function readWorkflow(file: string): Workflow {
  const document: unknown = parse(readFileSync(join(WORKFLOW_DIR, file), 'utf8'))
  if (!isRecord(document)) {
    throw new InvalidDefinitionDocument(`${file} is not a mapping`)
  }
  const inputs = readOptionalRecord(document, 'inputs')
  const requiredInputs =
    inputs === undefined
      ? []
      : readList(inputs, 'required').filter((name): name is string => typeof name === 'string')
  const jobs = readRecords(document, 'jobs')
  const steps = jobs.flatMap((job) => readRecords(job, 'steps'))
  const tasks = steps
    .map((step) => readOptionalRecord(step, 'task'))
    .filter((task): task is Record<string, unknown> => task !== undefined)
  return {
    file,
    id: readString(document, 'id'),
    name: readString(document, 'name'),
    jobNames: namesOf(jobs),
    stepNames: namesOf(steps),
    requiredInputs,
    behavioursCalled: tasks
      .map((task) => readOptionalString(task, 'behavior'))
      .filter((name): name is string => name !== undefined),
    behaviourMethodCalls: tasks
      .map((task) => readOptionalString(task, 'methodName'))
      .filter((name): name is string => name !== undefined),
  }
}

function readWorkflows(): readonly Workflow[] {
  return readdirSync(WORKFLOW_DIR)
    .filter((name) => name.endsWith('.yaml'))
    .map(readWorkflow)
}

function dataSourcesIn(text: string): readonly string[] {
  return [...text.matchAll(/data\.latest\(\s*"([^"]+)"/g)]
    .map((match) => match[1])
    .filter((name): name is string => name !== undefined)
}

const stages = readFactory()
const workflows = readWorkflows()

describe('the factory definition', () => {
  it('declares exactly one initial stage', () => {
    expect(stages.filter((stage) => stage.initial).map((stage) => stage.id)).toStrictEqual([
      'preparing',
    ])
  })

  it('declares at least one terminal stage', () => {
    expect(stages.filter((stage) => stage.terminal).map((stage) => stage.id)).toStrictEqual([
      'awaiting-human-review',
      'aborted',
    ])
  })

  it('gives every stage a unique lower case id', () => {
    const ids = stages.map((stage) => stage.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(/^[a-z][a-z0-9_-]*$/)
    }
  })

  it('points every transition at a stage that exists', () => {
    const known = new Set(stages.map((stage) => stage.id))
    const targets = stages.flatMap((stage) => stage.transitions.map((transition) => transition.to))
    for (const target of targets) {
      expect(known.has(target), `transition to ${target}`).toBe(true)
    }
  })

  it('names a declared workflow in every workflow mode stage', () => {
    const declared = new Set(workflows.map((workflow) => workflow.name))
    const workflowStages = stages.filter((stage) => stage.workMode === 'workflow')
    expect(workflowStages.length).toBeGreaterThan(0)
    for (const stage of workflowStages) {
      expect(
        declared.has(readRequired(stage.workflowName, 'workflowName')),
        `stage ${stage.id}`,
      ).toBe(true)
    }
  })

  it('gates every workflow mode stage on its own workflow succeeding', () => {
    for (const stage of stages.filter((entry) => entry.workMode === 'workflow')) {
      const gated = stage.transitions.flatMap((transition) =>
        transition.gates.filter((gate) => gate.type === 'workflow-succeeded'),
      )
      expect(
        gated.map((gate) => gate.workflow),
        `stage ${stage.id}`,
      ).toContain(stage.workflowName)
    }
  })

  it('binds every required workflow input in the stage that calls it', () => {
    const byName = new Map(workflows.map((workflow) => [workflow.name, workflow]))
    for (const stage of stages.filter((entry) => entry.workMode === 'workflow')) {
      const called = byName.get(readRequired(stage.workflowName, 'workflowName'))
      if (called === undefined) {
        throw new InvalidDefinitionDocument(`no workflow named ${stage.workflowName}`)
      }
      for (const required of called.requiredInputs) {
        expect(
          stage.workflowInputs,
          `stage ${stage.id} does not bind required input ${required} of ${called.name}`,
        ).toContain(required)
      }
    }
  })

  it('gives every workflow mode stage a resultEvidence so its outcome is gateable', () => {
    for (const stage of stages.filter((entry) => entry.workMode === 'workflow')) {
      expect(stage.resultEvidence, `stage ${stage.id}`).toBeTruthy()
    }
  })

  it('declares every artefact a gate refers to', () => {
    const declared = new Set(stages.flatMap((stage) => stage.artifacts))
    const referenced = stages
      .flatMap((stage) => stage.transitions)
      .flatMap((transition) => transition.gates)
      .filter((gate) => gate.type.startsWith('artifact-') || gate.type === 'findings-clear')
      .map((gate) => gate.artifact)
      .filter((name): name is string => name !== undefined)
    expect(referenced.length).toBeGreaterThan(0)
    for (const name of referenced) {
      expect(declared.has(name), `gate refers to undeclared artefact ${name}`).toBe(true)
    }
  })

  it('declares every evidence a gate refers to', () => {
    const declared = new Set(stages.flatMap((stage) => stage.evidence))
    const referenced = stages
      .flatMap((stage) => stage.transitions)
      .flatMap((transition) => transition.gates)
      .filter((gate) => gate.type === 'evidence-recorded')
      .map((gate) => gate.evidence)
      .filter((name): name is string => name !== undefined)
    for (const name of referenced) {
      expect(declared.has(name), `gate refers to undeclared evidence ${name}`).toBe(true)
    }
  })
})

describe('the workflows', () => {
  it('names every file after its id', () => {
    for (const workflow of workflows) {
      expect(workflow.file).toBe(`workflow-${workflow.id}.yaml`)
    }
  })

  it('uses a uuid for every id', () => {
    for (const workflow of workflows) {
      expect(workflow.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      )
    }
  })

  it('uses a unique name for every workflow', () => {
    const names = workflows.map((workflow) => workflow.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('gives every job and step a name', () => {
    for (const workflow of workflows) {
      for (const name of [...workflow.jobNames, ...workflow.stepNames]) {
        expect(name, workflow.file).toBeTruthy()
      }
    }
  })

  it('only calls behaviours that exist', () => {
    const known = new Set([BEHAVIOUR_NAME, FACTORY_NAME])
    for (const workflow of workflows) {
      for (const behaviour of workflow.behavioursCalled) {
        expect(known.has(behaviour), `${workflow.file} calls ${behaviour}`).toBe(true)
      }
    }
  })

  it('only reads data written by a behaviour that exists', () => {
    const known = new Set([BEHAVIOUR_NAME, FACTORY_NAME])
    for (const workflow of workflows) {
      const text = readFileSync(join(WORKFLOW_DIR, workflow.file), 'utf8')
      for (const source of dataSourcesIn(text)) {
        expect(known.has(source), `${workflow.file} reads ${source}`).toBe(true)
      }
    }
  })
})

describe('the behaviour type', () => {
  it('declares every method the workflows call', () => {
    const source = readFileSync(
      join(SWAMP_DIR, 'extensions', 'behaviors', 'maintainer-git.ts'),
      'utf8',
    )
    const declared = new Set(
      [...source.matchAll(/^ {4}([A-Za-z][A-Za-z0-9]*): \{/gm)]
        .map((match) => match[1])
        .filter((name): name is string => name !== undefined),
    )
    const called = new Set(
      workflows.flatMap((workflow) =>
        workflow.behavioursCalled.includes(BEHAVIOUR_NAME) ? workflow.behaviourMethodCalls : [],
      ),
    )
    expect(called.size).toBeGreaterThan(0)
    for (const method of called) {
      expect(declared.has(method), `workflows call maintainer-git.${method}`).toBe(true)
    }
  })
})
