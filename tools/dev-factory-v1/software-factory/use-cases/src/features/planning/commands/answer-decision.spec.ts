import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { InvalidDecision } from '@dev-factory-v1/domain-model/domain/planning/decision'
import { InboxFile } from '../adapters/inbox/inbox-file'
import { DecisionRepository } from '../data-access/decision/decision-repository'
import { AnswerDecision } from './answer-decision'

const decisionFile = [
  'id: d-2',
  'type: decision',
  'document: ARCH.md',
  'question: Will the merged graph be written to one file?',
  'answer: null',
  'followed: false',
  'outcome: null',
].join('\n')

function factoryIn(text: string): { answerDecision: AnswerDecision; folder: string } {
  const folder = mkdtempSync(join(tmpdir(), 'factory-answer-'))
  mkdirSync(join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads'), {
    recursive: true,
  })
  writeFileSync(
    join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads', 'd-2.yml'),
    text,
  )
  return {
    folder,
    answerDecision: new AnswerDecision(
      new DecisionRepository(folder),
      new InboxFile(folder),
      () => '2026-11-27T09:41:00Z',
    ),
  }
}

describe('AnswerDecision', () => {
  it('hands the decision to the agent', () => {
    const { answerDecision } = factoryIn(decisionFile)

    const result = answerDecision.execute({
      epic: 'cross-repo-linking',
      decision: 'd-2',
      choice: 'proposal',
      chosen: 'Write one merged graph file per workspace.',
      reply: null,
    })

    expect(result).toStrictEqual({ decision: 'd-2', waitsFor: 'agent' })
  })

  it('writes your answer to the decision file', () => {
    const { answerDecision, folder } = factoryIn(decisionFile)

    answerDecision.execute({
      epic: 'cross-repo-linking',
      decision: 'd-2',
      choice: 'alternative',
      chosen: 'Write one file per repository.',
      reply: null,
    })

    const written = readFileSync(
      join(folder, 'docs', 'project', 'PRD', 'cross-repo-linking', 'threads', 'd-2.yml'),
      'utf8',
    )
    expect(written).toContain('choice: alternative')
    expect(written).toContain('Write one file per repository.')
    expect(written).toContain('time: 2026-11-27T09:41:00Z')
  })

  it('puts a decision event in the inbox', () => {
    const { answerDecision, folder } = factoryIn(decisionFile)

    answerDecision.execute({
      epic: 'cross-repo-linking',
      decision: 'd-2',
      choice: 'proposal',
      chosen: 'Write one merged graph file per workspace.',
      reply: null,
    })

    const line = readFileSync(join(folder, '.factory', 'inbox.jsonl'), 'utf8')
    expect(JSON.parse(line)).toStrictEqual({
      kind: 'decision',
      n: 1,
      time: '2026-11-27T09:41:00Z',
      epic: 'cross-repo-linking',
      item: 'd-2',
    })
  })

  it('refuses a second answer', () => {
    const { answerDecision } = factoryIn(decisionFile)
    const answer = {
      epic: 'cross-repo-linking',
      decision: 'd-2',
      choice: 'proposal',
      chosen: 'Write one merged graph file per workspace.',
      reply: null,
    }
    answerDecision.execute(answer)

    expect(() => answerDecision.execute(answer)).toThrow(
      new InvalidDecision('The decision d-2 has already been answered.'),
    )
  })
})
