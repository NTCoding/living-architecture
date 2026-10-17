/**
 * Check 3. A file based agent at src/mastra/agents/{agent}/ with config.ts and
 * instructions.md.
 *
 * Part A asks whether a plain import of the Mastra instance discovers the
 * agent. The installed docs say discovery only happens through `mastra dev` or
 * `mastra build`, so this measures it rather than assuming it.
 *
 * Part B asks whether the same files can be loaded by hand, which is what a CLI
 * entrypoint would have to do if discovery does not run.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Agent } from '@mastra/core/agent'
import type { FsAgentConfig } from '@mastra/core/agent'
import config from './app/src/mastra/agents/spike-agent/config'

const agentDirectory = join(process.cwd(), 'spike/app/src/mastra/agents/spike-agent')

async function main() {
  const { mastra } = await import('./app/src/mastra/index')
  const discovered = Object.keys(mastra.listAgents())
  console.log('agents found by importing the Mastra instance:', JSON.stringify(discovered))

  const instructions = readFileSync(join(agentDirectory, 'instructions.md'), 'utf8')
  const agent = new Agent({
    ...(config as FsAgentConfig),
    name: 'spike-agent',
    instructions,
  } as never)
  console.log('agent built by hand:', agent.name, '| model:', String(agent.model).slice(0, 40))
  console.log('instructions loaded:', instructions.trim().slice(0, 40))

  if (discovered.length > 0) {
    console.log(
      'CHECK 3 PART A: a plain import did discover the file based agent, which contradicts the installed docs',
    )
  } else {
    console.log(
      'CHECK 3 PART A CONFIRMED: a plain import discovers nothing, matching the installed docs',
    )
  }
  console.log(
    'CHECK 3 PART B PASS: config.ts and instructions.md load by hand into a working Agent',
  )
}

void main()
