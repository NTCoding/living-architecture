import { mkdirSync } from 'node:fs'
import { readIssueStatesWithGithub } from '@dev-factory-v1/use-cases/planning-adapters/github/issue-states'
import { assetEndpoint } from '../features/planning/entrypoint/http/asset'
import { pageEndpoint } from '../features/planning/entrypoint/http/page'
import { FileChangeStreams } from '../infra/http/presentation/change-stream'
import { staticFileOf } from '../infra/http/presentation/static-files'
import { renderPlanningDocument } from '../infra/external-clients/markdown/render-planning-document'
import { changesEndpoint } from '../infra/http/presentation/changes-endpoint'
import { serveFactory } from '../infra/http/presentation/serve'
import { agentClosesItemEndpoint } from '../features/planning/entrypoint/http/agent-closes-item'
import { agentRepliesEndpoint } from '../features/planning/entrypoint/http/agent-replies'
import { answerDecisionEndpoint } from '../features/planning/entrypoint/http/answer-decision'
import { captureIdeaEndpoint } from '../features/planning/entrypoint/http/capture-idea'
import { commentOnDocumentEndpoint } from '../features/planning/entrypoint/http/comment-on-document'
import { documentEndpoint } from '../features/planning/entrypoint/http/document'
import { epicEndpoint } from '../features/planning/entrypoint/http/epic'
import { overviewBoardEndpoint } from '../features/planning/entrypoint/http/overview-board'
import { planningBoardEndpoint } from '../features/planning/entrypoint/http/planning-board'
import { readJsonBody } from '../features/planning/entrypoint/http/read-body'
import { ListRuns } from '@dev-factory-v1/use-cases/queries/list-runs'
import { ShowRun } from '@dev-factory-v1/use-cases/queries/show-run'
import { recordStoriesEndpoint } from '../features/planning/entrypoint/http/record-stories'
import { runEndpoint, runsEndpoint } from '../features/planning/entrypoint/http/runs'
import { replyToThreadEndpoint } from '../features/planning/entrypoint/http/reply-to-thread'
import { startPlanningEndpoint } from '../features/planning/entrypoint/http/start-planning'
import { serverEndpoint } from '../features/planning/entrypoint/http/server'
import { waitingForYouEndpoint } from '../features/planning/entrypoint/http/waiting-for-you'

type StartFactoryOptions = {
  readonly port: number
  readonly targetRepo: string
  readonly log: (text: string) => void
  readonly uiFolder: string
  readonly workflowRuns: ConstructorParameters<typeof ListRuns>[0]
  readonly runCommand: (request: {
    readonly workingDirectory: string
    readonly arguments: readonly string[]
  }) => Promise<{ readonly exitCode: number; readonly stdout: string; readonly stderr: string }>
}

/**
 * @riviere-role main
 *
 * Starts the factory's HTTP server with the planning routes on it. The port it listens on is the
 * one `/api/server` reports, which is why the routes read it from the same place.
 */
export async function startFactory(options: StartFactoryOptions) {
  mkdirSync(`${options.targetRepo}/.factory`, { recursive: true })
  const listening = { port: options.port }
  const changes = new FileChangeStreams({ checkMilliseconds: 250, log: options.log })
  const readUiFile = (name: string) => staticFileOf(options.uiFolder, name)
  const issueStates = readIssueStatesWithGithub({
    runCommand: options.runCommand,
    workingDirectory: options.targetRepo,
  })
  const served = await serveFactory({
    port: options.port,
    log: options.log,
    routes: [
      { method: 'GET', path: '/', handle: pageEndpoint(readUiFile) },
      { method: 'GET', path: '/planning/*', handle: pageEndpoint(readUiFile) },
      { method: 'GET', path: '/prds/*', handle: pageEndpoint(readUiFile) },
      { method: 'GET', path: '/runs/*', handle: pageEndpoint(readUiFile) },
      { method: 'GET', path: '/assets/:file', handle: assetEndpoint(readUiFile) },
      { method: 'GET', path: '/api/server', handle: serverEndpoint(() => listening.port) },
      {
        method: 'GET',
        path: '/api/overview-board',
        handle: overviewBoardEndpoint(options.targetRepo),
      },
      {
        method: 'GET',
        path: '/api/planning-board',
        handle: planningBoardEndpoint(options.targetRepo),
      },
      {
        method: 'GET',
        path: '/api/waiting-for-you',
        handle: waitingForYouEndpoint(options.targetRepo),
      },
      { method: 'GET', path: '/api/changes', handle: changesEndpoint(changes, options.targetRepo) },
      {
        method: 'GET',
        path: '/api/epics/:epic',
        handle: epicEndpoint(options.targetRepo, issueStates),
      },
      {
        method: 'GET',
        path: '/api/epics/:epic/documents/:document',
        handle: documentEndpoint(options.targetRepo, renderPlanningDocument),
      },
      {
        method: 'GET',
        path: '/api/runs',
        handle: runsEndpoint(new ListRuns(options.workflowRuns)),
      },
      {
        method: 'GET',
        path: '/api/runs/:run',
        handle: runEndpoint(new ShowRun(options.workflowRuns)),
      },
      {
        method: 'POST',
        path: '/api/ideas',
        handle: captureIdeaEndpoint(options.targetRepo, readJsonBody),
      },
      {
        method: 'POST',
        path: '/api/ideas/:idea/start-planning',
        handle: startPlanningEndpoint(options.targetRepo),
      },
      {
        method: 'POST',
        path: '/api/epics/:epic/threads',
        handle: commentOnDocumentEndpoint(options.targetRepo, readJsonBody),
      },
      {
        method: 'POST',
        path: '/api/epics/:epic/threads/:thread/replies',
        handle: replyToThreadEndpoint(options.targetRepo, readJsonBody),
      },
      {
        method: 'POST',
        path: '/api/epics/:epic/decisions/:decision',
        handle: answerDecisionEndpoint(options.targetRepo, readJsonBody),
      },
      {
        method: 'POST',
        path: '/api/agent/epics/:epic/threads/:thread/replies',
        handle: agentRepliesEndpoint(options.targetRepo, readJsonBody),
      },
      {
        method: 'POST',
        path: '/api/agent/epics/:epic/items/:item/done',
        handle: agentClosesItemEndpoint(options.targetRepo),
      },
      {
        method: 'POST',
        path: '/api/agent/epics/:epic/stories',
        handle: recordStoriesEndpoint(options.targetRepo, readJsonBody),
      },
    ],
  })
  listening.port = served.port
  return { port: served.port, close: served.close, changes }
}
