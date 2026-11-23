import { execFile } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { createNodeServer } from '@mastra/deployer/server'
import type {
  CommandOutput,
  CommandRequest,
} from '@dev-factory-v1/use-cases/external-clients/process/run-command'
import { buildFactory } from './build-factory'
import { startFactory } from './start-factory'

type ServerOptions = NonNullable<Parameters<typeof createNodeServer>[1]> & {
  readonly port: number
}

const execFileAsync = promisify(execFile)

const FACTORY_PORT = 4800
const STUDIO_PORT = 4111

/**
 * @riviere-role main
 *
 * The one process the factory runs: the HTTP server that the UI and the agent commands talk to,
 * and Mastra Studio beside it on the same instance. `./start-factory-ui` starts this.
 */
export async function runFactory(): Promise<void> {
  const targetRepo = process.env['FACTORY_TARGET_REPO']
  if (targetRepo === undefined || targetRepo === '') {
    process.stderr.write(
      'FACTORY_TARGET_REPO is not set. Start the factory through ./start-factory-ui.\n',
    )
    process.exitCode = 1
    return
  }
  loadEnvironment(targetRepo)
  withStudioAssets()
  const factory = await buildFactory(targetRepo)
  const served = await startFactory({
    port: FACTORY_PORT,
    targetRepo,
    uiFolder: join(import.meta.dirname, '..', '..', '..', 'ui', 'dist'),
    log: (text) => {
      process.stdout.write(`${text}\n`)
    },
    runCommand: (request: {
      readonly workingDirectory: string
      readonly arguments: readonly string[]
    }) => runProcess({ ...request, command: 'gh' }),
  })
  writeFileSync(
    join(targetRepo, '.factory', 'server.json'),
    JSON.stringify({ port: served.port, pid: process.pid }),
    'utf8',
  )
  const options: ServerOptions = { studio: true, tools: {}, port: STUDIO_PORT }
  await createNodeServer(factory.mastra, options)
  process.stdout.write(
    `The factory is at http://127.0.0.1:${String(served.port)} and Studio at http://localhost:${String(STUDIO_PORT)}\n`,
  )
}

async function runProcess(request: CommandRequest): Promise<CommandOutput> {
  try {
    const { stdout, stderr } = await execFileAsync(request.command, [...request.arguments], {
      cwd: request.workingDirectory,
      maxBuffer: 10 * 1024 * 1024,
    })
    return { stdout, stderr, exitCode: 0 }
  } catch (error) {
    return {
      stdout: textOf(error, 'stdout'),
      stderr: textOf(error, 'stderr'),
      exitCode: numberOf(error),
    }
  }
}

function textOf(value: unknown, name: string): string {
  if (!isMapping(value)) return String(value)
  const field = value[name]
  return typeof field === 'string' ? field : String(value)
}

function numberOf(value: unknown): number {
  if (!isMapping(value)) return 1
  const code = value['code']
  return typeof code === 'number' ? code : 1
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function loadEnvironment(targetRepo: string): void {
  mkdirSync(join(targetRepo, '.factory'), { recursive: true })
  try {
    process.loadEnvFile(`${targetRepo}/.env`)
  } catch {
    // A repo without a .env file is normal.
  }
  const configuredHost = process.env['MASTRA_HOST']
  if (configuredHost === undefined || configuredHost === '') {
    process.env['MASTRA_HOST'] = '127.0.0.1'
  }
}

function withStudioAssets(): void {
  const mastraPackageJson = createRequire(import.meta.url).resolve('mastra/package.json')
  process.env['MASTRA_STUDIO_PATH'] = join(dirname(mastraPackageJson), 'dist', 'studio')
}

await runFactory()
