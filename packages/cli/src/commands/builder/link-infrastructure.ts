import { readFile } from 'node:fs/promises';
import { ComponentNotFoundError, RiviereBuilder } from '@living-architecture/riviere-builder';
import { parseRiviereGraph } from '@living-architecture/riviere-schema';
import { formatError } from '../../output';
import { CliErrorCode } from '../../error-codes';

export function reportGraphNotFound(graphPath: string): void {
  console.log(
    JSON.stringify(
      formatError(CliErrorCode.GraphNotFound, `Graph not found at ${graphPath}`, ['Run riviere builder init first'])
    )
  );
}

export async function loadGraphBuilder(graphPath: string): Promise<RiviereBuilder> {
  const content = await readFile(graphPath, 'utf-8');
  const parsed: unknown = JSON.parse(content);
  const graph = parseRiviereGraph(parsed);
  return RiviereBuilder.resume(graph);
}

export function handleComponentNotFoundError(error: unknown): void {
  if (!(error instanceof ComponentNotFoundError)) {
    throw error;
  }
  console.log(JSON.stringify(formatError(CliErrorCode.ComponentNotFound, error.message, error.suggestions)));
}

export function tryBuilderOperation<T>(operation: () => T): T | undefined {
  try {
    return operation();
  } catch (error) {
    handleComponentNotFoundError(error);
    return undefined;
  }
}
