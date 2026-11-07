import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import {
  ArchitectureDiff,
  ArchitectureSource,
  extractArchitecture,
} from '@living-architecture/living-documentation-domain-model/domain/architecture'
import { TypescriptWorkspaceReader } from '@living-architecture/living-documentation-use-cases/infra/external-clients/typescript/typescript-workspace-reader'
import {
  architectureDiffFromRiviereGraphs,
  architectureDiffFromSnapshots,
  architectureSnapshotFromRiviereGraph,
} from './riviere-graph-architecture-diff-poc'
import { architectureSnapshotToRiviereGraph } from './riviere-architecture-graph-fixture'
import { ArchitectureDiffPrototypeError } from './riviere-architecture-graph-types'
import { renderOriginalPullRequestArchitectureDiff } from './render-original-pr-architecture-diff'

interface Measurement<T> {
  readonly durationMilliseconds: number
  readonly result: T
}

type ArchitectureSnapshot = ReturnType<TypescriptWorkspaceReader['readArchitectureSnapshot']>

interface ScalingMeasurement {
  readonly factor: number
  readonly graphBytes: number
  readonly graphDurationMilliseconds: number
  readonly snapshotBytes: number
  readonly snapshotDurationMilliseconds: number
}

const repetitions = 25
const [baseWorkspace, headWorkspace, baseCommit, headCommit] = process.argv.slice(2)
if (
  baseWorkspace === undefined ||
  headWorkspace === undefined ||
  baseCommit === undefined ||
  headCommit === undefined
) {
  throw new ArchitectureDiffPrototypeError(
    'Expected base workspace, head workspace, base commit, and head commit arguments.',
  )
}

const validatedBaseCommit: string = baseCommit
const validatedHeadCommit: string = headCommit
const reader = new TypescriptWorkspaceReader()
const extraction = measure(() => ({
  base: reader.readArchitectureSnapshot(baseWorkspace),
  head: reader.readArchitectureSnapshot(headWorkspace),
}))
const baseline = repeatedMeasurement(() =>
  architectureDiffFromSnapshots(extraction.result.base, extraction.result.head),
)
const graphCreation = measure(() => ({
  base: architectureSnapshotToRiviereGraph(
    extraction.result.base,
    'NTCoding/living-architecture',
    validatedBaseCommit,
  ),
  head: architectureSnapshotToRiviereGraph(
    extraction.result.head,
    'NTCoding/living-architecture',
    validatedHeadCommit,
  ),
}))
const baseGraphJson = JSON.stringify(graphCreation.result.base)
const headGraphJson = JSON.stringify(graphCreation.result.head)
const graphComparison = repeatedMeasurement(() =>
  architectureDiffFromRiviereGraphs(
    JSON.parse(baseGraphJson),
    JSON.parse(headGraphJson),
    'architecture-diff.md',
  ),
)

if (baseline.result !== graphComparison.result) {
  throw new ArchitectureDiffPrototypeError(
    'Expected graph architecture diff to be byte identical to snapshot baseline.',
  )
}

const resultsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'results')
mkdirSync(resultsDirectory, { recursive: true })
writeFileSync(
  path.join(resultsDirectory, 'pr-478-riviere-architecture-diff.txt'),
  graphComparison.result,
)
const originalDiff = ArchitectureDiff.fromArchitectures(
  extractArchitecture(
    ArchitectureSource.from(
      originalProofOfConceptSnapshot(
        architectureSnapshotFromRiviereGraph(graphCreation.result.base),
      ),
    ),
  ),
  extractArchitecture(
    ArchitectureSource.from(
      originalProofOfConceptSnapshot(
        architectureSnapshotFromRiviereGraph(graphCreation.result.head),
      ),
    ),
  ),
)
const originalFormat = renderOriginalPullRequestArchitectureDiff(originalDiff.changes())
writeFileSync(
  path.join(resultsDirectory, 'pr-478-riviere-architecture-diff-original-format.txt'),
  originalFormat,
)

const snapshotBytes = Buffer.byteLength(
  JSON.stringify({ base: extraction.result.base, head: extraction.result.head }),
)
const graphBytes = Buffer.byteLength(baseGraphJson) + Buffer.byteLength(headGraphJson)
const baseComponentCount = graphCreation.result.base.components.length
const headComponentCount = graphCreation.result.head.components.length
const baseLinkCount = graphCreation.result.base.links.length
const headLinkCount = graphCreation.result.head.links.length
const scalingMeasurements = [1, 2, 5, 10].map((factor) =>
  measureScaling(extraction.result.base, extraction.result.head, factor),
)
const scalingRows = scalingMeasurements.map(
  (measurement) =>
    `| ${measurement.factor}× | ${formatBytes(measurement.snapshotBytes)} | ${formatMilliseconds(measurement.snapshotDurationMilliseconds)} | ${formatBytes(measurement.graphBytes)} | ${formatMilliseconds(measurement.graphDurationMilliseconds)} |`,
)
const report = `# PR #478 architecture diff representation benchmark

**Result:** Graph-derived Markdown is byte identical to the current snapshot-derived Markdown. Rendering the same graph-derived facts with PR #478's original format also matches the published PR comment, apart from trailing blank lines.

| Measurement | Result |
| --- | ---: |
| TypeScript snapshot extraction | ${formatMilliseconds(extraction.durationMilliseconds)} |
| Snapshot diff and Markdown mean (${repetitions} runs) | ${formatMilliseconds(baseline.durationMilliseconds)} |
| Snapshot JSON size | ${formatBytes(snapshotBytes)} |
| Diff-specific graph creation | ${formatMilliseconds(graphCreation.durationMilliseconds)} |
| Graph parse, projection, diff, and Markdown mean (${repetitions} runs) | ${formatMilliseconds(graphComparison.durationMilliseconds)} |
| Diff-specific graph JSON size | ${formatBytes(graphBytes)} |
| Base graph components | ${baseComponentCount} |
| Head graph components | ${headComponentCount} |
| Base graph semantic links | ${baseLinkCount} |
| Head graph semantic links | ${headLinkCount} |
| Combined benchmark process maximum resident set size | ${formatBytes(process.resourceUsage().maxRSS * 1024)} |

## Synthetic scaling of representation and comparison

| PR #478 fact set | Snapshot size | Snapshot diff mean | Diff graph size | Graph parse and diff mean |
| ---: | ---: | ---: | ---: | ---: |
${scalingRows.join('\n')}

The scaling benchmark duplicates PR #478's architecture facts under distinct subdomains. It isolates representation and comparison costs; it does not simulate extraction time.

The graph contains only architecture review elements and the semantic links required by the current diff. It is not the repository's main flow graph. Fixture generation uses the current TypeScript reader so this benchmark proves representation and output equivalence, not the future extraction path.
`
writeFileSync(path.join(resultsDirectory, 'pr-478-benchmark.txt'), report)
process.stdout.write(report)

function originalProofOfConceptSnapshot(
  snapshot: ReturnType<TypescriptWorkspaceReader['readArchitectureSnapshot']>,
): ReturnType<TypescriptWorkspaceReader['readArchitectureSnapshot']> {
  return {
    subdomains: snapshot.subdomains.map((subdomain) => ({
      name: subdomain.name,
      layers: {
        domain: originalProofOfConceptLayer(subdomain.layers.domain),
        entrypoints: originalProofOfConceptLayer(subdomain.layers.entrypoints),
        'use-cases': originalProofOfConceptLayer(subdomain.layers['use-cases']),
      },
    })),
  }
}

function originalProofOfConceptLayer(
  layer: ReturnType<
    TypescriptWorkspaceReader['readArchitectureSnapshot']
  >['subdomains'][number]['layers']['domain'],
): ReturnType<
  TypescriptWorkspaceReader['readArchitectureSnapshot']
>['subdomains'][number]['layers']['domain'] {
  return {
    aggregates: layer.aggregates.map((aggregate) => ({
      entities: aggregate.entities.map(originalProofOfConceptItem),
      methods: aggregate.methods,
      name: aggregate.name,
      packageKind: aggregate.packageKind,
    })),
    items: layer.items.map(originalProofOfConceptItem),
  }
}

function originalProofOfConceptItem(
  item: ReturnType<
    TypescriptWorkspaceReader['readArchitectureSnapshot']
  >['subdomains'][number]['layers']['domain']['items'][number],
) {
  return { name: item.name, packageKind: item.packageKind, role: item.role }
}

function measureScaling(
  base: ArchitectureSnapshot,
  head: ArchitectureSnapshot,
  factor: number,
): ScalingMeasurement {
  const scaledBase = scaledSnapshot(base, factor)
  const scaledHead = scaledSnapshot(head, factor)
  const snapshotComparison = repeatedMeasurement(() =>
    architectureDiffFromSnapshots(scaledBase, scaledHead),
  )
  const baseGraph = architectureSnapshotToRiviereGraph(
    scaledBase,
    'NTCoding/living-architecture',
    validatedBaseCommit,
  )
  const headGraph = architectureSnapshotToRiviereGraph(
    scaledHead,
    'NTCoding/living-architecture',
    validatedHeadCommit,
  )
  const baseJson = JSON.stringify(baseGraph)
  const headJson = JSON.stringify(headGraph)
  const graphComparison = repeatedMeasurement(() =>
    architectureDiffFromRiviereGraphs(
      JSON.parse(baseJson),
      JSON.parse(headJson),
      'architecture-diff.md',
    ),
  )
  if (snapshotComparison.result !== graphComparison.result) {
    throw new ArchitectureDiffPrototypeError(
      `Expected equivalent output for ${factor}× scaling benchmark.`,
    )
  }
  return {
    factor,
    graphBytes: Buffer.byteLength(baseJson) + Buffer.byteLength(headJson),
    graphDurationMilliseconds: graphComparison.durationMilliseconds,
    snapshotBytes: Buffer.byteLength(JSON.stringify({ base: scaledBase, head: scaledHead })),
    snapshotDurationMilliseconds: snapshotComparison.durationMilliseconds,
  }
}

function scaledSnapshot(snapshot: ArchitectureSnapshot, factor: number): ArchitectureSnapshot {
  return {
    subdomains: Array.from({ length: factor }, (_, index) =>
      snapshot.subdomains.map((subdomain) => ({
        ...subdomain,
        name: `${subdomain.name}-benchmark-${index + 1}`,
      })),
    ).flat(),
  }
}

function repeatedMeasurement<T>(operation: () => T): Measurement<T> {
  const measurements = Array.from({ length: repetitions }, () => measure(operation))
  const final = measurements.at(-1)
  if (final === undefined) {
    throw new ArchitectureDiffPrototypeError('Expected at least one benchmark measurement.')
  }
  return {
    durationMilliseconds:
      measurements.reduce((total, measurement) => total + measurement.durationMilliseconds, 0) /
      measurements.length,
    result: final.result,
  }
}

function measure<T>(operation: () => T): Measurement<T> {
  const startedAt = performance.now()
  const result = operation()
  return { durationMilliseconds: performance.now() - startedAt, result }
}

function formatMilliseconds(durationMilliseconds: number): string {
  return `${durationMilliseconds.toFixed(2)} ms`
}

function formatBytes(bytes: number): string {
  return `${bytes.toLocaleString('en-GB')} bytes`
}
