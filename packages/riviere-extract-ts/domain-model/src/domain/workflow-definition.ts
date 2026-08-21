type DomainSystemType = 'domain' | 'bff' | 'ui' | 'external-service' | 'other'

type WorkflowDefinitionStage =
  | Readonly<{ kind: 'extract'; name: string; configPath: string }>
  | Readonly<{ kind: 'link'; configPath: string }>
  | Readonly<{ kind: 'validate' }>

/** @riviere-role value-object */
export class WorkflowDefinition {
  declare private readonly brand: 'WorkflowDefinition'

  private constructor(
    readonly graph: {
      readonly domains: Readonly<
        Record<string, { readonly description: string; readonly systemType: DomainSystemType }>
      >
      readonly outputPath: string
      readonly sources: readonly { readonly repository: string }[]
    },
    readonly runLogDirectory: string,
    readonly stages: readonly WorkflowDefinitionStage[],
  ) {}

  static parse(input: unknown):
    | { readonly success: true; readonly data: WorkflowDefinition }
    | { readonly success: false; readonly error: string } {
    const workflow = asRecord(input)
    if (workflow === undefined) return failure('workflow must be an object')
    if (workflow['version'] !== 1) return failure('version must be 1')
    const graph = parseGraph(workflow)
    if (!graph.success) return graph
    const runLog = requiredObject(workflow, 'runLog')
    if (!runLog.success) return runLog
    const runLogDirectory = requiredString(runLog.data, 'directory')
    if (!runLogDirectory.success) return runLogDirectory
    const stages = requiredArray(workflow, 'stages')
    if (!stages.success) return stages
    const parsedStages = parseStages(stages.data)
    if (!parsedStages.success) return parsedStages
    return {
      success: true,
      data: new WorkflowDefinition(graph.data, runLogDirectory.data, parsedStages.data),
    }
  }
}

function parseGraph(input: Record<string, unknown>) {
  const graph = requiredObject(input, 'graph')
  if (!graph.success) return graph
  const sources = parseSources(graph.data)
  if (!sources.success) return sources
  const domains = parseDomains(graph.data)
  if (!domains.success) return domains
  const outputPath = requiredString(graph.data, 'outputPath')
  if (!outputPath.success) return outputPath
  return {
    success: true as const,
    data: { domains: domains.data, outputPath: outputPath.data, sources: sources.data },
  }
}

function parseSources(input: Record<string, unknown>) {
  const sources = requiredArray(input, 'sources')
  if (!sources.success) return sources
  if (sources.data.length === 0) return failure('graph.sources must not be empty')
  const parsedSources: { repository: string }[] = []
  for (const [index, source] of sources.data.entries()) {
    const sourceRecord = asRecord(source)
    if (sourceRecord === undefined) return failure(`graph.sources[${index}] must be an object`)
    const repository = requiredString(sourceRecord, 'repository')
    if (!repository.success) return repository
    parsedSources.push({ repository: repository.data })
  }
  return { success: true as const, data: parsedSources }
}

function parseDomains(input: Record<string, unknown>) {
  const domains = requiredArray(input, 'domains')
  if (!domains.success) return domains
  if (domains.data.length === 0) return failure('graph.domains must not be empty')
  const parsedDomains: [string, { description: string; systemType: DomainSystemType }][] = []
  const domainNames = new Set<string>()
  for (const [index, domain] of domains.data.entries()) {
    const domainRecord = asRecord(domain)
    if (domainRecord === undefined) return failure(`graph.domains[${index}] must be an object`)
    const name = requiredString(domainRecord, 'name')
    if (!name.success) return name
    if (domainNames.has(name.data)) return failure(`graph.domains[${index}] has a duplicate name`)
    domainNames.add(name.data)
    const description = optionalString(domainRecord, 'description')
    if (!description.success) return description
    const systemType = optionalSystemType(domainRecord)
    if (!systemType.success) return systemType
    parsedDomains.push([name.data, {
      description: description.data ?? name.data,
      systemType: systemType.data ?? 'domain',
    }])
  }
  return { success: true as const, data: Object.fromEntries(parsedDomains) }
}

function parseStages(input: readonly unknown[]) {
  const stages: WorkflowDefinitionStage[] = []
  for (const [index, stage] of input.entries()) {
    const parsedStage = parseStage(stage, index)
    if (!parsedStage.success) return parsedStage
    stages.push(parsedStage.data)
  }
  const extracts = stages.filter((stage) => stage.kind === 'extract')
  const links = stages.filter((stage) => stage.kind === 'link')
  const validates = stages.filter((stage) => stage.kind === 'validate')
  const names = extracts.map((stage) => stage.name)
  if (new Set(names).size !== names.length) return failure('Extract stage names must be unique')
  if (extracts.length === 0) return failure('Workflow must contain an extract stage')
  if (links.length !== 1) return failure('Workflow must contain exactly one link stage')
  if (validates.length !== 1) return failure('Workflow must contain exactly one validate stage')
  const expectedKinds = [...extracts.map(() => 'extract'), 'link', 'validate']
  if (stages.map((stage) => stage.kind).join(',') !== expectedKinds.join(',')) {
    return failure('Workflow stages must be ordered as extract, link, validate')
  }
  return { success: true as const, data: stages }
}

function parseStage(input: unknown, index: number) {
  const stage = asRecord(input)
  if (stage === undefined) return failure(`stages[${index}] must be an object`)
  const entries = Object.entries(stage)
  if (!hasOneStageType(entries)) return failure(`stages[${index}] must contain one stage type`)
  const [kind, definition] = entries[0]
  const stageDefinition = asRecord(definition)
  if (stageDefinition === undefined) return failure(`stages[${index}].${kind} must be an object`)
  if (kind === 'extract') return parseExtractStage(stageDefinition)
  if (kind === 'link') return parseLinkStage(stageDefinition)
  if (kind === 'validate') return validValidateStage()
  return failure(`Unknown workflow stage type '${kind}'`)
}

function hasOneStageType(entries: [string, unknown][]): entries is [[string, unknown]] {
  return entries.length === 1
}

function parseExtractStage(input: Record<string, unknown>) {
  const name = requiredString(input, 'name')
  if (!name.success) return name
  const configPath = requiredString(input, 'config')
  if (!configPath.success) return configPath
  return {
    success: true as const,
    data: { kind: 'extract' as const, name: name.data, configPath: configPath.data },
  }
}

function parseLinkStage(input: Record<string, unknown>) {
  const configPath = requiredString(input, 'config')
  if (!configPath.success) return configPath
  return { success: true as const, data: { kind: 'link' as const, configPath: configPath.data } }
}

function validValidateStage(): { success: true; data: { kind: 'validate' } } {
  return { success: true, data: { kind: 'validate' } }
}

function requiredObject(input: Record<string, unknown>, property: string) {
  const value = asRecord(input[property])
  return value === undefined ? failure(`${property} is required`) : { success: true as const, data: value }
}

function requiredArray(input: Record<string, unknown>, property: string) {
  const value = input[property]
  return Array.isArray(value) ? { success: true as const, data: value } : failure(`${property} is required`)
}

function requiredString(input: Record<string, unknown>, property: string) {
  const value = input[property]
  return typeof value === 'string' && value.trim() !== ''
    ? { success: true as const, data: value }
    : failure(`${property} is required`)
}

function optionalString(input: Record<string, unknown>, property: string) {
  const value = input[property]
  if (value === undefined) return { success: true as const, data: undefined }
  return typeof value === 'string'
    ? { success: true as const, data: value }
    : failure(`${property} must be a string`)
}

function optionalSystemType(input: Record<string, unknown>) {
  const value = input['systemType']
  if (value === undefined) return { success: true as const, data: undefined }
  return typeof value === 'string' && isSystemType(value)
    ? { success: true as const, data: value }
    : failure('systemType is invalid')
}

function isSystemType(value: string): value is DomainSystemType {
  return (
    value === 'domain' ||
    value === 'bff' ||
    value === 'ui' ||
    value === 'external-service' ||
    value === 'other'
  )
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : undefined
}

function failure(error: string) {
  return { success: false as const, error }
}
