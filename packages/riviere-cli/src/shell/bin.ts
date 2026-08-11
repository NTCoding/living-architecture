import { createProgram } from './cli'
import { handleGlobalError } from './global-error-handler'

const program = createProgram()
program.parseAsync().catch(handleGlobalError)
