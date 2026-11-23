import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AgentInbox } from '@dev-factory-v1/domain-model/domain/planning/inbox/agent-inbox'
import { InvalidEpic } from '@dev-factory-v1/domain-model/domain/planning/epic'
import { NotAnEarlierStep } from '@dev-factory-v1/domain-model/domain/planning/planning-step'
import { InboxFile } from '../adapters/inbox/inbox-file'
import { EpicRepository } from '../data-access/epic/epic-repository'
import { SendBack } from './send-back'

const epicFile = [
  'title: Cross-repo linking',
  'idea: cross-repo-linking',
  'stage: planning',
  'step: architecture',
  'history: []',
  'features: []',
].join('\n')

function factoryIn(text: string): { sendBack: SendBack; folder: string } {
  const folder = mkdtempSync(join(tmpdir(), 'factory-send-back-'))
  mkdirSync(join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking'), { recursive: true })
  writeFileSync(join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'epic.yml'), text)
  return {
    folder,
    sendBack: new SendBack(
      new EpicRepository(folder),
      new AgentInbox(new InboxFile(folder)),
      () => '2026-11-27T10:15:00Z',
    ),
  }
}

describe('SendBack', () => {
  it('moves the epic back and says which step it went to', () => {
    const { sendBack } = factoryIn(epicFile)

    const result = sendBack.execute({
      epic: 'cross-repo-linking',
      to: 'prd',
      reason: 'Component ids are only unique inside one graph.',
    })

    expect(result).toStrictEqual({ epic: 'cross-repo-linking', step: 'prd' })
  })

  it('writes the new step and the reason to the epic file', () => {
    const { sendBack, folder } = factoryIn(epicFile)

    sendBack.execute({
      epic: 'cross-repo-linking',
      to: 'prd',
      reason: 'Component ids are only unique inside one graph.',
    })

    const written = readFileSync(
      join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'epic.yml'),
      'utf8',
    )
    expect(written).toContain('step: prd')
    expect(written).toContain('event: sent-back')
    expect(written).toContain('Component ids are only unique inside one graph.')
  })

  it('puts both steps and the reason in the inbox event', () => {
    const { sendBack, folder } = factoryIn(epicFile)

    sendBack.execute({
      epic: 'cross-repo-linking',
      to: 'prd',
      reason: 'Component ids are only unique inside one graph.',
    })

    const line = readFileSync(join(folder, '.factory', 'inbox.jsonl'), 'utf8')
    expect(JSON.parse(line)).toStrictEqual({
      kind: 'sent-back',
      n: 1,
      time: '2026-11-27T10:15:00Z',
      epic: 'cross-repo-linking',
      from: 'architecture',
      to: 'prd',
      reason: 'Component ids are only unique inside one graph.',
    })
  })

  it('refuses a step that is not earlier than the one it is on', () => {
    const { sendBack } = factoryIn(epicFile)

    expect(() =>
      sendBack.execute({ epic: 'cross-repo-linking', to: 'dogfooding', reason: 'Change it.' }),
    ).toThrow(new NotAnEarlierStep('architecture', 'dogfooding'))
  })

  it('refuses an epic that is not being planned', () => {
    const { sendBack } = factoryIn(
      epicFile.replace('stage: planning\nstep: architecture', 'stage: in-progress'),
    )

    expect(() =>
      sendBack.execute({ epic: 'cross-repo-linking', to: 'prd', reason: 'Change it.' }),
    ).toThrow(
      new InvalidEpic('cross-repo-linking is not being planned, so it cannot be sent back.'),
    )
  })
})
