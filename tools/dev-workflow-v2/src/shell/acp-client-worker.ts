import { readStdin } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/acp/acp-session'
import {
  registerAcpTerminationHandler,
  runAcpClientWorker,
} from '@living-architecture/dev-workflow-v2-use-cases/external-clients/acp/acp-client-worker'

const input: unknown = JSON.parse(await readStdin())
await runAcpClientWorker(input, process.cwd(), (processes) =>
  registerAcpTerminationHandler(
    processes,
    (listener) => process.once('SIGTERM', listener),
    process.exit,
  ),
)
