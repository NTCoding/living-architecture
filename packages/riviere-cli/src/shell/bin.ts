import { createProgram } from './cli'
import { handleGlobalError } from '../platform/infra/cli-presentation/global-error-handler'

const program = createProgram()
program.parseAsync().catch(handleGlobalError)
