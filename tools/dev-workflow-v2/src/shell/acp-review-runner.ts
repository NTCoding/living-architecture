import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import {
  client,
  methods,
  ndJsonStream,
  PROTOCOL_VERSION,
  type ClientContext,
  type InitializeResponse,
  type Stream,
} from '@agentclientprotocol/sdk'
import {
  reviewPayloadSchema,
  type ReviewPayload,
} from '@nt-ai-lab/deterministic-agent-workflow-engine'

const inheritedEnvironmentKeys = ['HOME', 'LANG', 'LC_ALL', 'PATH', 'SHELL', 'TMPDIR'] as const
const forbiddenCredentialName =
  /^(?:GH_TOKEN|GH_[A-Z0-9_]+|GITHUB_TOKEN|GITHUB_[A-Z0-9_]+|GIT_ASKPASS)$/u

class AcpReviewError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AcpReviewError'
  }
}

class AcpReviewTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AcpReviewTimeoutError'
  }
}

interface AcpReviewRunnerConfig {
  readonly command: string
  readonly args: readonly string[]
  readonly timeoutMs: number
  readonly cancellationGraceMs: number
  readonly environment?: Readonly<Record<string, string>>
}

interface AcpReviewLaunch {
  readonly reviewType: string
  readonly prompt: string
  readonly workingDirectory: string
  readonly attemptId: string
  readonly reviewerDefinitionVersion: string
}

interface AcpReviewResult {
  readonly payload: ReviewPayload
  readonly providerSessionId: string
}

/** @riviere-role main */
export function createAcpReviewRunner(
  config: AcpReviewRunnerConfig,
): (launch: AcpReviewLaunch) => Promise<AcpReviewResult> {
  validateConfig(config)
  requireAcpProcessGroups()
  return (launch) => runReviewerProcess(config, launch)
}

async function runReviewerProcess(
  config: AcpReviewRunnerConfig,
  launch: AcpReviewLaunch,
): Promise<AcpReviewResult> {
  const active = spawnReviewerProcess(config, launch.workingDirectory)
  const stream = buildAgentStream(active)
  const app = client({ name: 'dev-workflow-v2' })
  const timeout = createTimeout(
    config.timeoutMs,
    `ACP review (${launch.reviewType}) timed out after ${String(config.timeoutMs)}ms.`,
  )
  const connectWith = app.connectWith(stream, async (ctx) => {
    const initialization = await initializeAgent(ctx)
    if (initialization.protocolVersion !== PROTOCOL_VERSION) {
      throw new AcpReviewError(
        `ACP review (${launch.reviewType}) uses unsupported protocol version ${String(initialization.protocolVersion)}; expected ${String(PROTOCOL_VERSION)}.`,
      )
    }
    const session = await ctx.buildSession(launch.workingDirectory).start()
    try {
      const response = await session.prompt(launch.prompt)
      if (response.stopReason !== 'end_turn') {
        throw new AcpReviewError(
          `ACP review (${launch.reviewType}) prompt stopped without completion: ${response.stopReason}.`,
        )
      }
      const text = (await session.readText()).trim()
      if (text.length === 0) {
        const stderr = active.stderr().trim()
        throw new AcpReviewError(
          stderr.length === 0
            ? `ACP review (${launch.reviewType}) returned no review output.`
            : `ACP review (${launch.reviewType}) returned no review output. stderr: ${stderr}`,
        )
      }
      return {
        payload: parseReviewPayload(launch.reviewType, text),
        providerSessionId: session.sessionId,
      }
    } finally {
      session.dispose()
    }
  })
  const outcome = await Promise.race([
    connectWith.then(
      (result) => ({
        type: 'completed' as const,
        result,
      }),
      (error) => ({
        type: 'failed' as const,
        reason: describeError(error),
      }),
    ),
    active.processFailure.then(
      () => ({
        type: 'failed' as const,
        reason: `ACP review (${launch.reviewType}) process exited before protocol completion. stderr: ${active.stderr().trim()}`,
      }),
      (error) => ({
        type: 'failed' as const,
        reason: describeError(error),
      }),
    ),
    timeout.promise.then(
      () => ({
        type: 'timed-out' as const,
      }),
      () => ({
        type: 'timed-out' as const,
      }),
    ),
  ])
  timeout.clear()
  await stopReviewerProcess(active, config.cancellationGraceMs, config.timeoutMs)
  if (outcome.type === 'timed-out') {
    throw new AcpReviewError(
      `ACP review (${launch.reviewType}) timed out after ${String(config.timeoutMs)}ms. stderr: ${active.stderr().trim()}`,
    )
  }
  if (outcome.type === 'failed') {
    throw new AcpReviewError(outcome.reason)
  }
  return outcome.result
}

function parseReviewPayload(reviewType: string, text: string): ReviewPayload {
  const parsed = parseJson(text, reviewType)
  const parsedReview = reviewPayloadSchema.safeParse(parsed)
  if (!parsedReview.success) {
    throw new AcpReviewError(
      `ACP review (${reviewType}) returned an invalid review payload. ${parsedReview.error.message}`,
    )
  }
  return parsedReview.data
}

function parseJson(text: string, reviewType: string): unknown {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new AcpReviewError(
      `ACP review (${reviewType}) returned invalid JSON. ${describeError(error)}`,
    )
  }
}

async function initializeAgent(ctx: ClientContext): Promise<InitializeResponse> {
  return ctx.request(methods.agent.initialize, {
    protocolVersion: PROTOCOL_VERSION,
    clientCapabilities: {},
    clientInfo: {
      name: 'dev-workflow-v2',
      version: '0.0.1',
    },
  })
}

function spawnReviewerProcess(
  config: AcpReviewRunnerConfig,
  workingDirectory: string,
): ActiveReviewerProcess {
  const child = spawn(config.command, [...config.args], {
    cwd: workingDirectory,
    env: buildProcessEnvironment(config.environment),
    shell: false,
    detached: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const stderrChunks: string[] = []
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk: string) => stderrChunks.push(chunk))
  const processFailure = new Promise<never>((_resolve, reject) => {
    child.once('error', (error) => {
      reject(new AcpReviewError(`ACP process failed to start: ${String(error)}`))
    })
    child.once('exit', (code, signal) => {
      reject(
        new AcpReviewError(
          `ACP process exited before protocol completion (code ${String(code)}, signal ${String(signal)}). stderr: ${stderrChunks.join('').trim()}`,
        ),
      )
    })
  })
  return {
    child,
    stderr: () => stderrChunks.join(''),
    processFailure,
  }
}

function buildAgentStream(active: ActiveReviewerProcess): Stream {
  const output = new WritableStream<Uint8Array>({
    write(chunk) {
      return new Promise<void>((resolve, reject) => {
        active.child.stdin.write(chunk, (error) => {
          if (error === null) resolve()
          else reject(error)
        })
      })
    },
  })
  const input = new ReadableStream<Uint8Array>({
    start(controller) {
      active.child.stdout.on('data', (chunk: Uint8Array) => controller.enqueue(chunk))
      active.child.stdout.on('end', () => controller.close())
      active.child.stdout.on('error', (error) => controller.error(error))
    },
    cancel() {
      active.child.stdout.destroy()
    },
  })
  return ndJsonStream(output, input)
}

function buildProcessEnvironment(configured?: Readonly<Record<string, string>>): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {}
  for (const key of inheritedEnvironmentKeys) {
    const value = process.env[key]
    if (value !== undefined) environment[key] = value
  }
  for (const [key, value] of Object.entries(configured ?? {})) {
    environment[key] = value
  }
  return environment
}

function validateConfig(config: AcpReviewRunnerConfig): void {
  if (config.command.trim().length === 0) {
    throw new AcpReviewError('ACP reviewer command must not be empty.')
  }
  if (!Number.isSafeInteger(config.timeoutMs) || config.timeoutMs <= 0) {
    throw new AcpReviewError('ACP reviewer timeoutMs must be a positive safe integer.')
  }
  if (!Number.isSafeInteger(config.cancellationGraceMs) || config.cancellationGraceMs <= 0) {
    throw new AcpReviewError('ACP reviewer cancellationGraceMs must be a positive safe integer.')
  }
  for (const key of Object.keys(config.environment ?? {})) {
    if (forbiddenCredentialName.test(key)) {
      throw new AcpReviewError(`ACP reviewer environment must not include credential ${key}.`)
    }
  }
}

function requireAcpProcessGroups(): void {
  if (process.platform === 'darwin' || process.platform === 'linux') return
  throw new AcpReviewError(
    `ACP review processes are not supported on ${process.platform}; darwin and linux only.`,
  )
}

async function stopReviewerProcess(
  active: ActiveReviewerProcess,
  graceMs: number,
  terminationTimeoutMs: number,
): Promise<void> {
  const pid = active.child.pid
  if (pid === undefined) return
  if (!signalProcessGroup(pid, 'SIGTERM')) return
  const groupEmpty = waitForProcessGroupEmpty(pid)
  const grace = createTimeout<void>(
    graceMs,
    `ACP process did not stop within ${String(graceMs)}ms.`,
  )
  try {
    await Promise.race([groupEmpty, grace.promise])
  } catch {
    signalProcessGroup(pid, 'SIGKILL')
    const termination = createTimeout<void>(
      terminationTimeoutMs,
      `ACP process did not terminate within ${String(terminationTimeoutMs)}ms.`,
    )
    try {
      await Promise.race([groupEmpty, termination.promise])
    } finally {
      termination.clear()
    }
  } finally {
    grace.clear()
  }
}

function waitForProcessGroupEmpty(pid: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const probe = setInterval(() => {
      if (!signalProcessGroup(pid, 0)) {
        clearInterval(probe)
        resolve()
      }
    }, 25)
  })
}

function signalProcessGroup(pid: number, signal: NodeJS.Signals | 0): boolean {
  try {
    process.kill(-pid, signal)
    return true
  } catch (error) {
    if (isErrnoException(error) && (error.code === 'ESRCH' || error.code === 'EPERM')) return false
    throw error
  }
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}

function createTimeout<T>(
  milliseconds: number,
  message: string,
): {
  readonly promise: Promise<T>
  readonly clear: () => void
} {
  const state: { timer?: NodeJS.Timeout } = {}
  const promise = new Promise<T>((_resolve, reject) => {
    state.timer = setTimeout(() => reject(new AcpReviewTimeoutError(message)), milliseconds)
  })
  return {
    promise,
    clear: () => {
      if (state.timer !== undefined) clearTimeout(state.timer)
    },
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

type ActiveReviewerProcess = {
  readonly child: ChildProcessWithoutNullStreams
  readonly stderr: () => string
  readonly processFailure: Promise<never>
}
