import { TypescriptWorkspaceReader } from '@living-architecture/living-documentation-use-cases/infra/external-clients/typescript/typescript-workspace-reader'
import { architectureSnapshotToRiviereGraph } from './riviere-architecture-graph-fixture'
import { ArchitectureDiffPrototypeError } from './riviere-architecture-graph-types'
import {
  architectureDiffFromRiviereGraphs,
  architectureDiffFromSnapshots,
} from './riviere-graph-architecture-diff-poc'

const [approach, baseWorkspaceRoot, headWorkspaceRoot, baseCommit, headCommit] =
  process.argv.slice(2)
if (
  (approach !== 'snapshot' && approach !== 'graph') ||
  baseWorkspaceRoot === undefined ||
  headWorkspaceRoot === undefined ||
  baseCommit === undefined ||
  headCommit === undefined
) {
  throw new ArchitectureDiffPrototypeError(
    'Usage: benchmark-architecture-diff-memory-worker.ts <snapshot|graph> <base-workspace> <head-workspace> <base-commit> <head-commit>',
  )
}

const validatedBaseCommit: string = baseCommit
const validatedHeadCommit: string = headCommit
const reader = new TypescriptWorkspaceReader()
const baseSnapshot = reader.readArchitectureSnapshot(baseWorkspaceRoot)
const headSnapshot = reader.readArchitectureSnapshot(headWorkspaceRoot)
const output =
  approach === 'snapshot'
    ? repeatedOutput(() => architectureDiffFromSnapshots(baseSnapshot, headSnapshot))
    : graphOutput()

process.stdout.write(`${Buffer.byteLength(output)}\n`)

function graphOutput(): string {
  const baseGraphJson = JSON.stringify(
    architectureSnapshotToRiviereGraph(
      baseSnapshot,
      'NTCoding/living-architecture',
      validatedBaseCommit,
    ),
  )
  const headGraphJson = JSON.stringify(
    architectureSnapshotToRiviereGraph(
      headSnapshot,
      'NTCoding/living-architecture',
      validatedHeadCommit,
    ),
  )
  return repeatedOutput(() =>
    architectureDiffFromRiviereGraphs(
      JSON.parse(baseGraphJson),
      JSON.parse(headGraphJson),
      'architecture-diff.md',
    ),
  )
}

function repeatedOutput(operation: () => string): string {
  const outputs = Array.from({ length: 25 }, operation)
  const final = outputs.at(-1)
  if (final === undefined) {
    throw new ArchitectureDiffPrototypeError('Expected at least one memory benchmark operation.')
  }
  return final
}
