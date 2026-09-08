import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createAcpReviewRunner } from './acp-review-runner'

type AcpReviewRunnerConfig = Parameters<typeof createAcpReviewRunner>[0]
type AcpReviewLaunch = Parameters<ReturnType<typeof createAcpReviewRunner>>[0]

const fixturePath = fileURLToPath(new URL('./__fixtures__/acp-fixture-agent.mjs', import.meta.url))
const earlyExitFixturePath = fileURLToPath(
  new URL('./__fixtures__/acp-early-exit.mjs', import.meta.url),
)

const processIdsSchema = z.array(z.number().int().safe().min(2)).length(2)
const processErrorSchema = z.object({ code: z.literal('ESRCH') })

function stopFixtureProcesses(path: string): void {
  if (!existsSync(path)) return
  for (const pid of processIdsSchema.parse(JSON.parse(readFileSync(path, 'utf8')))) {
    try {
      process.kill(pid, 'SIGKILL')
    } catch (error) {
      processErrorSchema.parse(error)
    }
  }
}

function buildConfig(overrides: Partial<AcpReviewRunnerConfig> = {}): AcpReviewRunnerConfig {
  return {
    command: process.execPath,
    args: [fixturePath],
    timeoutMs: 5_000,
    cancellationGraceMs: 100,
    ...overrides,
  }
}

function buildLaunch(overrides: Partial<AcpReviewLaunch> = {}): AcpReviewLaunch {
  return {
    reviewType: 'code-review',
    prompt: 'Review the fixture.',
    workingDirectory: mkdtempSync(join(tmpdir(), 'acp-review-runner-')),
    attemptId: 'attempt-1',
    reviewerDefinitionVersion: '1',
    ...overrides,
  }
}

it('rejects an empty reviewer command', () => {
  expect(() => createAcpReviewRunner(buildConfig({ command: ' ' }))).toThrow(
    'ACP reviewer command must not be empty.',
  )
})

it('rejects a non-positive reviewer timeout', () => {
  expect(() => createAcpReviewRunner(buildConfig({ timeoutMs: 0 }))).toThrow(
    'ACP reviewer timeoutMs must be a positive safe integer.',
  )
})

it('rejects a non-positive cancellation grace period', () => {
  expect(() => createAcpReviewRunner(buildConfig({ cancellationGraceMs: 0 }))).toThrow(
    'ACP reviewer cancellationGraceMs must be a positive safe integer.',
  )
})

it('rejects reviewer environments that carry credentials', () => {
  expect(() => createAcpReviewRunner(buildConfig({ environment: { GH_TOKEN: 'secret' } }))).toThrow(
    'ACP reviewer environment must not include credential GH_TOKEN.',
  )
})

it('runs one review through a fake ACP agent and returns the parsed payload', async () => {
  const runner = createAcpReviewRunner(buildConfig())
  const result = await runner(buildLaunch())
  expect(result).toStrictEqual({
    payload: {
      verdict: 'PASS',
      findings: [],
    },
    providerSessionId: 'fixture-session',
  })
})

it('records the exact failure when the reviewer returns invalid JSON', async () => {
  const runner = createAcpReviewRunner(
    buildConfig({ environment: { ACP_FIXTURE_REVIEW: 'not-json' } }),
  )
  await expect(runner(buildLaunch())).rejects.toThrow(
    'ACP review (code-review) returned invalid JSON.',
  )
})

it('records the exact failure when the reviewer returns an invalid review payload', async () => {
  const runner = createAcpReviewRunner(
    buildConfig({ environment: { ACP_FIXTURE_REVIEW: '{"verdict":"MAYBE"}' } }),
  )
  await expect(runner(buildLaunch())).rejects.toThrow(
    'ACP review (code-review) returned an invalid review payload.',
  )
})

it('fails closed when the reviewer advertises an unsupported protocol version', async () => {
  const runner = createAcpReviewRunner(
    buildConfig({ environment: { ACP_FIXTURE_PROTOCOL_VERSION: '2' } }),
  )
  await expect(runner(buildLaunch())).rejects.toThrow(
    'ACP review (code-review) uses unsupported protocol version 2',
  )
})

it('fails closed when the reviewer does not complete within the timeout', async () => {
  const runner = createAcpReviewRunner(
    buildConfig({
      environment: { ACP_FIXTURE_HANG: 'true' },
      timeoutMs: 500,
    }),
  )
  await expect(runner(buildLaunch())).rejects.toThrow(
    'ACP review (code-review) timed out after 500ms.',
  )
})

it('removes descendants when the agent exits before initialization', async () => {
  const workingDirectory = mkdtempSync(join(tmpdir(), 'acp-review-runner-cleanup-'))
  const processIdsPath = join(workingDirectory, 'process-ids.json')
  const runner = createAcpReviewRunner({
    command: process.execPath,
    args: [earlyExitFixturePath],
    environment: { ACP_FIXTURE_PIDS: processIdsPath },
    timeoutMs: 5_000,
    cancellationGraceMs: 100,
  })
  try {
    await expect(runner(buildLaunch({ workingDirectory }))).rejects.toThrow(
      /exited before protocol completion|connection closed/u,
    )
    const processIds = processIdsSchema.parse(JSON.parse(readFileSync(processIdsPath, 'utf8')))
    await vi.waitFor(() => {
      for (const pid of processIds) expect(() => process.kill(pid, 0)).toThrow('ESRCH')
    })
  } finally {
    stopFixtureProcesses(processIdsPath)
    rmSync(workingDirectory, {
      recursive: true,
      force: true,
    })
  }
})
