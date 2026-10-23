import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { createNodeServer } from '@mastra/deployer/server'
import { buildFactory } from './main'

const PORT = 4111

type ServerOptions = NonNullable<Parameters<typeof createNodeServer>[1]> & {
  readonly port: number
}

/**
 * The Mastra UI is served from the static assets that ship with the `mastra` package, not from
 * the deployer itself, so the deployer is told where those assets live.
 */
function withMastraUiAssets(): void {
  const mastraPackageJson = createRequire(import.meta.url).resolve('mastra/package.json')
  process.env['MASTRA_STUDIO_PATH'] = join(dirname(mastraPackageJson), 'dist', 'studio')
}

/**
 * Serves the same Mastra instance the factory CLI uses, so Mastra Studio can show the traces
 * and spans that observability persists to `.factory/mastra.db`.
 *
 * @riviere-role main
 */
export async function serveStudio(): Promise<void> {
  const workingDirectory = process.cwd()
  withMastraUiAssets()
  try {
    process.loadEnvFile(`${workingDirectory}/.env`)
  } catch (error) {
    if (!(error instanceof Error)) throw error
  }
  mkdirSync(`${workingDirectory}/.factory`, { recursive: true })
  const factory = await buildFactory(workingDirectory)
  const options: ServerOptions = {
    studio: true,
    tools: {},
    port: PORT,
  }
  await createNodeServer(factory.mastra, options)
  process.stdout.write(`The Mastra UI is running at http://localhost:${String(PORT)}\n`)
}

if (
  process.argv[1]?.endsWith('server.js') === true ||
  process.argv[1]?.endsWith('server.ts') === true
) {
  void serveStudio().then(() => {
    process.stdout.write('Press Ctrl+C to stop.\n')
  })
}
