import { createProgram } from './cli'

const program = createProgram()
program.parseAsync().catch(() => process.exit(1))
