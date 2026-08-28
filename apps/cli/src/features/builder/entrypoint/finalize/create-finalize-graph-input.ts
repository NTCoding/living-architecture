import type { FinalizeGraphInput } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/finalize-graph-input'

/** @riviere-role command-input-factory-input */
interface FinalizeGraphFactoryInput {
  readonly graph?: string
  readonly output?: string
}

/** @riviere-role command-input-factory */
export function createFinalizeGraphInput(
  options: FinalizeGraphFactoryInput,
  defaultGraphFileLocation: string,
): FinalizeGraphInput {
  return {
    graphFileLocation: options.graph ?? defaultGraphFileLocation,
    outputPath: options.output ?? options.graph ?? '.riviere/graph.json',
  }
}
