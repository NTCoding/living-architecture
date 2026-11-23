import type { IncomingMessage, ServerResponse } from 'node:http'
import { FileChangeStreams } from './change-stream'

/**
 * @riviere-role http-change-stream
 *
 * `GET /api/changes` opens the stream that tells the browser which file changed.
 */
export function changesEndpoint(changes: FileChangeStreams, targetRepo: string) {
  return (_request: IncomingMessage, response: ServerResponse): void => {
    changes.open(watchedFilesOf(targetRepo), response)
  }
}

function watchedFilesOf(
  targetRepo: string,
): readonly { readonly path: string; readonly event: string }[] {
  return [
    { path: `${targetRepo}/docs/project/PRD`, event: 'epics' },
    { path: `${targetRepo}/project-memory/ideas`, event: 'ideas' },
    { path: `${targetRepo}/.factory/inbox.jsonl`, event: 'inbox' },
  ]
}
