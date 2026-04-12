import { main } from '../features/enforcement/entrypoint/cli'

void main(process.argv, process.cwd())
  .then((exitCode) => {
    process.exitCode = exitCode
  })
  .catch((error: unknown) => {
    process.stderr.write(error instanceof Error ? `${error.message}\n` : String(error))
    process.exitCode = 1
  })
