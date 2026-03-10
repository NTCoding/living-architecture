import { createProgram } from './cli'
import { handleGlobalError } from '../platform/infra/middleware/global-error-handler'

const program = createProgram()
program.parseAsync().catch(handleGlobalError)
