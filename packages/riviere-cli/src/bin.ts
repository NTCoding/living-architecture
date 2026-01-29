import { createProgram } from './shell/cli'

const program = createProgram()
program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
