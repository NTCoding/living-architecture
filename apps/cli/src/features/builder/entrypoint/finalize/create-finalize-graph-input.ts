import type { FinalizeGraphInput } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/finalize-graph-input'

/** @riviere-role command-input-factory-input */
interface FinalizeGraphFactoryInput {
  readonly graph?: string
  readonly output?: string
}

/** @riviere-role command-input-factory */
export function createFinalizeGraphInput(
  options: FinalizeGraphFactoryInput,
): FinalizeGraphInput {
  return {
    graphPathOption: options.graph,
    outputPath: options.output ?? options.graph ?? '.riviere/graph.json',
  }
}
