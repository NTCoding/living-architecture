/**
 * Where a thread's selection is now, after the agent has rewritten the document.
 *
 * `attached` means the text was found, and gives the lines it is on now. `detached` means the
 * agent's rewrite removed it, so the thread is shown without its passage rather than beside the
 * wrong one.
 *
 * @riviere-role domain-event
 */
export type AnchorPosition =
  | {
      readonly kind: 'attached'
      readonly firstLine: number
      readonly lastLine: number
      readonly occurrence: number
    }
  | { readonly kind: 'detached' }

/**
 * What a thread stores about the passage it sits beside.
 *
 * @riviere-role domain-event
 */
export type ThreadAnchor = {
  readonly selectedText: string
  readonly prefix: string
  readonly suffix: string
  readonly firstLine: number
  readonly occurrence: number
}

type Span = {
  readonly start: number
  readonly end: number
  readonly cost: number
}

type Seed = {
  readonly start: number
  readonly end: number
}

interface MatchColumns {
  readonly costs: Int32Array
  readonly starts: Int32Array
  readonly nextCosts: Int32Array
  readonly nextStarts: Int32Array
  readonly unreachable: number
}

const lowestSimilarity = 0.75
const contextLength = 32

const segmenter = new Intl.Segmenter('en', { granularity: 'word' })

/**
 * @riviere-role domain-service
 *
 * @riviere-role-justification The agent rewrites a planning document between Nick's comment and
 * its reply, so the text he selected moves or goes. Finding it again is a rule about 2 pieces of
 * text rather than about the state of an aggregate.
 */
export function findAnchor(anchor: ThreadAnchor, markdown: string): AnchorPosition {
  const exact = asFound(exactMatches(anchor.selectedText, markdown))
  if (exact !== null) return attachedAt(anchor, markdown, exact)
  const fuzzy = asFound(similarMatches(anchor.selectedText, markdown, wordBoundariesOf(markdown)))
  if (fuzzy !== null) return attachedAt(anchor, markdown, fuzzy)
  return { kind: 'detached' }
}

function asFound(found: readonly Seed[]): readonly [Seed, ...Seed[]] | null {
  const first = found[0]
  return first === undefined ? null : [first, ...found.slice(1)]
}

function attachedAt(
  anchor: ThreadAnchor,
  markdown: string,
  found: readonly [Seed, ...Seed[]],
): AnchorPosition {
  const chosen = closestTo(anchor, markdown, found)
  return {
    kind: 'attached',
    firstLine: lineAt(markdown, chosen.start),
    lastLine: lineAt(markdown, chosen.end),
    occurrence: exactMatches(anchor.selectedText, markdown.slice(0, chosen.start)).length,
  }
}

function closestTo(
  anchor: ThreadAnchor,
  markdown: string,
  found: readonly [Seed, ...Seed[]],
): Seed {
  const [first, ...others] = found
  const inContext = found.filter((match) => contextMatches(anchor, markdown, match))[0]
  if (inContext !== undefined) return inContext
  const distanceTo = (seed: Seed): number =>
    Math.abs(lineAt(markdown, seed.start) - anchor.firstLine)
  return others.reduce((best, next) => (distanceTo(next) < distanceTo(best) ? next : best), first)
}

function contextMatches(anchor: ThreadAnchor, markdown: string, match: Seed): boolean {
  const prefix = context(anchor.prefix)
  const suffix = context(anchor.suffix)
  return (
    (prefix !== '' && contextBefore(markdown, match.start).endsWith(prefix)) ||
    (suffix !== '' && contextAfter(markdown, match.end).startsWith(suffix))
  )
}

function context(text: string): string {
  return text.trim()
}

function contextBefore(markdown: string, start: number): string {
  return [...markdown.slice(0, start)].slice(-contextLength).join('')
}

function contextAfter(markdown: string, end: number): string {
  return [...markdown.slice(end)].slice(0, contextLength).join('')
}

function lineAt(markdown: string, offset: number): number {
  return markdown.slice(0, offset).split('\n').length
}

function exactMatches(quote: string, text: string): { start: number; end: number; cost: number }[] {
  if (quote === '') return []
  return [...text.matchAll(new RegExp(escapedPattern(quote), 'g'))].map((found) => ({
    start: found.index,
    end: found.index + quote.length,
    cost: 0,
  }))
}

function allowedEdits(quote: string): number {
  return Math.floor(quote.length * (1 - lowestSimilarity))
}

function wordBoundariesOf(text: string): Uint8Array {
  const boundaries = new Uint8Array(text.length + 1)
  boundaries[text.length] = 1
  for (const segment of segmenter.segment(text)) {
    boundaries[segment.index] = 1
  }
  return boundaries
}

function similarMatches(
  quote: string,
  text: string,
  boundaries: Uint8Array,
): { start: number; end: number; cost: number }[] {
  return bestOfOverlapping(spanEndsOf(quote, text, boundaries))
    .map((span) => trimmedSpan(span, text))
    .filter((span) => textSimilarity(quote, text.slice(span.start, span.end)) >= lowestSimilarity)
}

function spanEndsOf(quote: string, text: string, boundaries: Uint8Array): Span[] {
  const size = quote.length + 1
  const unreachable = quote.length + text.length + 1
  const columns: MatchColumns = {
    costs: Int32Array.from({ length: size }, (_, position) => position),
    starts: new Int32Array(size),
    nextCosts: new Int32Array(size),
    nextStarts: new Int32Array(size),
    unreachable,
  }
  const quoteCodes = Uint16Array.from({ length: quote.length }, (_, at) => quote.charCodeAt(at))
  const allowed = allowedEdits(quote)
  const ends: Span[] = []
  Uint16Array.from({ length: text.length }, (_, at) => text.charCodeAt(at)).forEach(
    (character, index) => {
      const column = index + 1
      advanceColumn(columns, quoteCodes, character, column, boundaries[column] === 1)
      const cost = Number(columns.costs[quote.length])
      if (boundaries[column] === 1 && cost <= allowed) {
        ends.push({ start: Number(columns.starts[quote.length]), end: column, cost })
      }
    },
  )
  return ends
}

function advanceColumn(
  columns: MatchColumns,
  quoteCodes: Uint16Array,
  character: number,
  column: number,
  startAllowed: boolean,
): void {
  const { costs, starts, nextCosts, nextStarts } = columns
  nextCosts[0] = startAllowed ? 0 : columns.unreachable
  nextStarts[0] = column
  quoteCodes.forEach((quoteCode, position) => {
    const replace = Number(costs[position]) + Number(quoteCode !== character)
    const skipText = Number(costs[position + 1]) + 1
    const skipQuote = Number(nextCosts[position]) + 1
    const cheapest = Math.min(replace, skipText, skipQuote)
    nextCosts[position + 1] = cheapest
    nextStarts[position + 1] = Number(
      startOfCheapest(cheapest, { replace, skipQuote }, columns, position),
    )
  })
  costs.set(nextCosts)
  starts.set(nextStarts)
}

function startOfCheapest(
  cheapest: number,
  costs: { readonly replace: number; readonly skipQuote: number },
  columns: MatchColumns,
  position: number,
): number | undefined {
  if (cheapest === costs.replace) return columns.starts[position]
  return cheapest === costs.skipQuote ? columns.nextStarts[position] : columns.starts[position + 1]
}

function bestOfOverlapping(ends: readonly Span[]): Span[] {
  return ends.reduce<Span[]>((groups, next) => {
    const current = groups.at(-1)
    if (current === undefined || next.start >= current.end) {
      groups.push(next)
    } else if (next.cost <= current.cost) {
      groups.splice(-1, 1, next)
    }
    return groups
  }, [])
}

function trimmedSpan(span: Span, text: string): Span {
  const found = text.slice(span.start, span.end)
  const start = span.start + found.length - found.trimStart().length
  const end = span.end - (found.length - found.trimEnd().length)
  return { ...span, start, end: Math.max(start, end) }
}

function textSimilarity(first: string, second: string): number {
  return 1 - editDistance(first, second) / Math.max(first.length, second.length)
}

function editDistance(first: string, second: string): number {
  const row = Int32Array.from({ length: second.length + 1 }, (_, position) => position)
  const nextRow = new Int32Array(row.length)
  const secondCodes = Uint16Array.from({ length: second.length }, (_, at) => second.charCodeAt(at))
  Uint16Array.from({ length: first.length }, (_, at) => first.charCodeAt(at)).forEach(
    (character, index) => {
      nextRow[0] = index + 1
      secondCodes.forEach((other, position) => {
        nextRow[position + 1] = Math.min(
          Number(row[position]) + Number(character !== other),
          Number(row[position + 1]) + 1,
          Number(nextRow[position]) + 1,
        )
      })
      row.set(nextRow)
    },
  )
  return Number(row[second.length])
}

function escapedPattern(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}
