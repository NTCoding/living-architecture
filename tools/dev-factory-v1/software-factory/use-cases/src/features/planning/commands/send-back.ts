import { AgentInbox } from '@dev-factory-v1/domain-model/domain/planning/inbox/agent-inbox'
import type { InboxLog } from '@dev-factory-v1/domain-model/domain/ports/inbox-log'
import { InvalidEpic } from '@dev-factory-v1/domain-model/domain/planning/epic'
import { PlanningStep } from '@dev-factory-v1/domain-model/domain/planning/planning-step'
import type { EpicRepository } from '../data-access/epic/epic-repository'

/** @riviere-role command-use-case-input */
export interface SendBackInput {
  readonly epic: string
  readonly to: string
  readonly reason: string
}

/** @riviere-role command-use-case-result */
export interface SendBackResult {
  readonly epic: string
  readonly step: string
}

/**
 * @riviere-role command-use-case
 *
 * Moves an epic back to an earlier planning step and tells the planning agent why. The reason goes
 * into the event as well as into the epic's history, so the agent does not have to open a second
 * file to know what to change.
 */
export class SendBack {
  constructor(
    private readonly epics: EpicRepository,
    private readonly log: InboxLog,
    private readonly now: () => string,
  ) {}

  execute(input: SendBackInput): SendBackResult {
    const time = this.now()
    const inbox = new AgentInbox(this.log)
    const epic = this.epics.load(input.epic)
    const stage = epic.stage()
    if (stage.kind !== 'planning') {
      throw new InvalidEpic(`${input.epic} is not being planned, so it cannot be sent back.`)
    }
    const to = PlanningStep.from(input.to)
    this.epics.save(input.epic, epic.sendBack(to, input.reason, time))
    inbox.append({
      kind: 'sent-back',
      number: inbox.lastNumber() + 1,
      time,
      epic: input.epic,
      from: stage.step.name(),
      to: to.name(),
      reason: input.reason,
    })
    return { epic: input.epic, step: to.name() }
  }
}
