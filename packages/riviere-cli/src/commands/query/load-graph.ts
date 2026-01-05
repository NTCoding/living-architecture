import { readFile } from 'node:fs/promises';
import { RiviereQuery } from '@living-architecture/riviere-query';
import {
  resolveGraphPath,
  getDefaultGraphPathDescription,
} from '../../graph-path';
import { fileExists } from '../../file-existence';
import { formatError } from '../../output';
import { CliErrorCode } from '../../error-codes';

export { getDefaultGraphPathDescription };

type JsonParseSuccess = {
 success: true;
data: unknown 
};
type JsonParseFailure = { success: false };
type JsonParseResult = JsonParseSuccess | JsonParseFailure;

function parseJsonSafely(content: string): JsonParseResult {
  try {
    return {
 success: true,
data: JSON.parse(content) 
};
  } catch {
    return { success: false };
  }
}

export interface LoadGraphResult {
  query: RiviereQuery;
  graphPath: string;
}

export interface LoadGraphError {error: ReturnType<typeof formatError>;}

function isLoadGraphError(
  result: LoadGraphResult | LoadGraphError,
): result is LoadGraphError {
  return 'error' in result;
}

export async function loadGraph(
  graphPathOption?: string,
): Promise<LoadGraphResult | LoadGraphError> {
  const graphPath = resolveGraphPath(graphPathOption);
  const graphExists = await fileExists(graphPath);

  if (!graphExists) {
    return {
      error: formatError(
        CliErrorCode.GraphNotFound,
        `Graph not found at ${graphPath}`,
        ['Run riviere builder init first'],
      ),
    };
  }

  const content = await readFile(graphPath, 'utf-8');

  const parseResult = parseJsonSafely(content);
  if (!parseResult.success) {
    return {
      error: formatError(
        CliErrorCode.GraphCorrupted,
        `Graph file at ${graphPath} is not valid JSON`,
        [
          'Check that the graph file contains valid JSON',
          'Try running riviere builder init to create a new graph',
        ],
      ),
    };
  }

  const query = RiviereQuery.fromJSON(parseResult.data);

  return {
 query,
graphPath 
};
}

export async function withGraph(
  graphPathOption: string | undefined,
  handler: (query: RiviereQuery) => Promise<void> | void,
): Promise<void> {
  const result = await loadGraph(graphPathOption);

  if (isLoadGraphError(result)) {
    console.log(JSON.stringify(result.error));
    return;
  }

  await handler(result.query);
}

export { isLoadGraphError };
