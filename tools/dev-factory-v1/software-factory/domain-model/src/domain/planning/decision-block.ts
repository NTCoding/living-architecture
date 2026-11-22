const FIELDS = ['proposal', 'alternative', 'pick'] as const

type DecisionField = (typeof FIELDS)[number]

type DecisionBlockFields = {
  readonly id: string
  readonly question: string | undefined
  readonly proposal: string
  readonly alternative: string
  readonly pick: string
  readonly firstLine: number
  readonly lastLine: number
}

/** @riviere-role domain-error */
export class InvalidDecisionBlock extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidDecisionBlock'
  }
}

/**
 * @riviere-role value-object
 *
 * An open question that the planning agent put in a planning document, with its 2 options and the
 * option the agent suggests. It is the `:::decision d-1` block in the document, read back.
 */
export class DecisionBlock {
  declare private readonly brand: 'DecisionBlock'

  private constructor(
    private readonly decisionId: string,
    private readonly asked: string,
    private readonly options: Readonly<Record<DecisionField, string>>,
    private readonly lines: { readonly first: number; readonly last: number },
  ) {}

  static from(fields: DecisionBlockFields): DecisionBlock {
    if (!/^d-\d+$/.test(fields.id)) {
      throw new InvalidDecisionBlock(`A decision id looks like d-1: ${fields.id}`)
    }
    const question = fields.question
    if (question === undefined || question.trim() === '') {
      throw new InvalidDecisionBlock(`The decision ${fields.id} has no question above it.`)
    }
    return new DecisionBlock(
      fields.id,
      question.trim(),
      { proposal: fields.proposal, alternative: fields.alternative, pick: fields.pick },
      { first: fields.firstLine, last: fields.lastLine },
    )
  }

  id(): string {
    return this.decisionId
  }

  question(): string {
    return this.asked
  }

  proposal(): string {
    return this.options.proposal
  }

  alternative(): string {
    return this.options.alternative
  }

  pick(): string {
    return this.options.pick
  }

  firstLine(): number {
    return this.lines.first
  }

  lastLine(): number {
    return this.lines.last
  }
}

type BlockLines = {
  readonly id: string
  readonly firstLine: number
  readonly body: readonly { readonly line: number; readonly text: string }[]
  readonly lastLine: number
}

/**
 * @riviere-role domain-service
 *
 * @riviere-role-justification A planning document is text that the agent writes, so its decisions
 * are read out of the text. That is a rule about the text rather than about the state of an
 * aggregate, and the document is rewritten between reads.
 */
export function decisionBlocksIn(markdown: string): readonly DecisionBlock[] {
  const lines = markdown.split('\n')
  return blockLinesIn(lines).map((block) => blockOf(lines, block))
}

type OpenBlock = {
  readonly id: string
  readonly firstLine: number
  readonly body: readonly { readonly line: number; readonly text: string }[]
}

type Scan = {
  readonly blocks: readonly BlockLines[]
  readonly open: OpenBlock | null
}

function blockLinesIn(lines: readonly string[]): readonly BlockLines[] {
  return lines.reduce<Scan>((scan, text, index) => nextLine(scan, text, index + 1), {
    blocks: [],
    open: null,
  }).blocks
}

function nextLine(scan: Scan, text: string, line: number): Scan {
  if (scan.open === null) return { ...scan, open: startedBlock(text, line) }
  if (text.trim() === ':::') {
    const finished = {
      id: scan.open.id,
      firstLine: scan.open.firstLine,
      body: scan.open.body,
      lastLine: line,
    }
    return { blocks: [...scan.blocks, finished], open: null }
  }
  return { ...scan, open: { ...scan.open, body: [...scan.open.body, { line, text }] } }
}

function startedBlock(text: string, line: number): OpenBlock | null {
  if (!text.startsWith(':::decision')) return null
  return { id: text.slice(':::decision'.length).trim(), firstLine: line, body: [] }
}

function blockOf(lines: readonly string[], block: BlockLines): DecisionBlock {
  const fields = fieldsOf(block)
  return DecisionBlock.from({
    id: block.id,
    question: questionAbove(lines, block.firstLine),
    proposal: fields.proposal,
    alternative: fields.alternative,
    pick: fields.pick,
    firstLine: block.firstLine,
    lastLine: block.lastLine,
  })
}

type CollectedFields = {
  readonly lines: Readonly<Record<DecisionField, readonly string[]>>
  readonly current: DecisionField | null
}

function fieldsOf(block: BlockLines): Readonly<Record<DecisionField, string>> {
  const collected = block.body.reduce<CollectedFields>(collectField, {
    lines: { proposal: [], alternative: [], pick: [] },
    current: null,
  })
  return {
    proposal: collected.lines.proposal.join('\n'),
    alternative: collected.lines.alternative.join('\n'),
    pick: collected.lines.pick.join('\n'),
  }
}

function collectField(
  collected: CollectedFields,
  entry: { readonly text: string },
): CollectedFields {
  const field = FIELDS.find((candidate) => entry.text.startsWith(`${candidate}:`))
  if (field !== undefined) {
    return {
      lines: {
        ...collected.lines,
        [field]: [...collected.lines[field], entry.text.slice(field.length + 1).trim()],
      },
      current: field,
    }
  }
  if (collected.current === null) return collected
  return {
    lines: {
      ...collected.lines,
      [collected.current]: [...collected.lines[collected.current], entry.text.trim()],
    },
    current: collected.current,
  }
}

function questionAbove(lines: readonly string[], firstLine: number): string | undefined {
  const headings = lines
    .slice(0, firstLine - 1)
    .map((text) => headingTextOf(text.trim()))
    .filter((text): text is string => text !== null)
  return headings.at(-1)
}

function headingTextOf(text: string): string | null {
  if (!text.startsWith('#')) return null
  const withoutHashes = text.replace(/^#+/, '').trim()
  return withoutHashes === '' ? null : withoutHashes
}
