import type { Command } from 'commander'
import { InboxFile } from '@dev-factory-v1/use-cases/planning-adapters/inbox/inbox-file'
import { ReadAgentInbox } from '@dev-factory-v1/use-cases/planning-queries/agent-inbox'

type AgentCommandsOptions = {
  readonly targetRepo: string
  readonly serverUrl: string
  readonly write: (text: string) => void
}

const POLL_MILLISECONDS = 500
const QUIET_MILLISECONDS = 10_000

/**
 * @riviere-role main
 *
 * The commands the planning session runs. `inbox` and `wait` read the inbox file, because only the
 * session reads it. `reply`, `done` and `stories` go through the server, because the server is the
 * only writer of the thread and epic files.
 */
export function addAgentCommands(program: Command, options: AgentCommandsOptions): void {
  const log = new InboxFile(options.targetRepo)

  program
    .command('inbox')
    .description('print the items that wait for the planning agent')
    .option('--all', 'print every item, not only the new ones')
    .action(async (commandOptions: { all?: boolean }) => {
      const read = new ReadAgentInbox(log).execute({
        lastPrinted: commandOptions.all === true ? 0 : log.printedNumber(),
      })
      read.events.forEach((event) => options.write(JSON.stringify(event)))
      if (read.events.length === 0) options.write('Nothing waits for the planning agent.')
    })

  program
    .command('wait')
    .description('wait until Nick has been quiet for 10 seconds, then print the new items')
    .action(async () => {
      const printed = log.printedNumber()
      const events = await waitForQuiet(
        () => new ReadAgentInbox(log).execute({ lastPrinted: printed }).events,
      )
      events.forEach((event) => options.write(JSON.stringify(event)))
      log.rememberPrinted(events.at(-1)?.number ?? printed)
    })

  program
    .command('reply')
    .description('reply to a thread as the planning agent')
    .argument('<epic>')
    .argument('<thread>')
    .argument('<text>')
    .action(async (epic: string, thread: string, text: string) => {
      options.write(
        await post(options.serverUrl, `/api/agent/epics/${epic}/threads/${thread}/replies`, {
          text,
        }),
      )
    })

  program
    .command('done')
    .description('close an item that the planning agent has dealt with')
    .argument('<epic>')
    .argument('<item>')
    .action(async (epic: string, item: string) => {
      options.write(
        await post(options.serverUrl, `/api/agent/epics/${epic}/items/${item}/done`, {}),
      )
    })

  program
    .command('stories')
    .description('record the features and their issue numbers')
    .argument('<epic>')
    .option('--feature <id...>', 'the id of a feature, then its issue numbers')
    .action(async (epic: string, commandOptions: { feature?: string[] }) => {
      options.write(
        await post(options.serverUrl, `/api/agent/epics/${epic}/stories`, {
          features: featuresOf(commandOptions.feature ?? []),
        }),
      )
    })
}

async function waitForQuiet(
  readEvents: () => readonly { readonly number: number }[],
): Promise<readonly { readonly number: number }[]> {
  const first = await pollUntilAny(readEvents)
  if (first.length === 0) return []
  await new Promise<void>((resolve) => {
    setTimeout(resolve, QUIET_MILLISECONDS)
  })
  const after = readEvents()
  return after.length === 0 ? first : after
}

async function pollUntilAny(
  readEvents: () => readonly { readonly number: number }[],
): Promise<readonly { readonly number: number }[]> {
  const events = readEvents()
  if (events.length > 0) return events
  await new Promise<void>((resolve) => {
    setTimeout(resolve, POLL_MILLISECONDS)
  })
  return pollUntilAny(readEvents)
}

function featuresOf(feature: readonly string[]): readonly {
  readonly id: string
  readonly title: string
  readonly stories: readonly number[]
}[] {
  const features: { id: string; title: string; stories: number[] }[] = []
  feature.forEach((word) => {
    const number = Number(word)
    if (Number.isInteger(number)) {
      features.at(-1)?.stories.push(number)
      return
    }
    features.push({ id: word, title: word, stories: [] })
  })
  return features
}

async function post(serverUrl: string, path: string, body: unknown): Promise<string> {
  const response = await fetch(`${serverUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return `${String(response.status)} ${await response.text()}`
}
