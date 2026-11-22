import MarkdownIt from 'markdown-it'
import type { Token } from 'markdown-it'

const parser = new MarkdownIt({ html: false, linkify: false })
const blockFence = ':::'

const MAPPED_TOKENS = [
  'paragraph_open',
  'heading_open',
  'bullet_list_open',
  'ordered_list_open',
  'blockquote_open',
  'table_open',
  'fence',
  'code_block',
  'hr',
]

parser.renderer.rules['fence'] = (tokens, index) =>
  tokens
    .slice(index, index + 1)
    .map((token) => fenceHtml(token))
    .join('')

function fenceHtml(token: Token): string {
  const language = firstWordOf(parser.utils.unescapeAll(token.info).trim())
  const languageClass =
    language === '' ? '' : ` class="language-${parser.utils.escapeHtml(language)}"`
  const code = parser.utils.escapeHtml(token.content)
  return `<pre${parser.renderer.renderAttrs(token)}><code${languageClass}>${code}</code></pre>\n`
}

/**
 * @riviere-role external-client-service
 *
 * Renders a planning document as the HTML that the PRD editor shows. Each top-level block carries
 * the lines it came from, so a thread sits beside the text it was written about. The 3 named
 * blocks become a placeholder that the UI fills, a sandboxed frame, or a note from the agent.
 */
export function renderPlanningDocument(markdown: string): string {
  return blocksOf(markdown).map(htmlOfBlock).join('')
}

type DocumentBlock =
  | { readonly kind: 'markdown'; readonly text: string; readonly firstLine: number }
  | {
      readonly kind: 'named'
      readonly name: string
      readonly option: string
      readonly text: string
    }

function blocksOf(markdown: string): readonly DocumentBlock[] {
  const lines = markdown.split('\n')
  const scanned = lines.reduce<BlockScan>(
    (state, opening, index) => nextBlock(state, lines, opening, index),
    { blocks: [], markdownFrom: 0, index: 0 },
  )
  const rest = lines.slice(scanned.markdownFrom).join('\n')
  return [...scanned.blocks, ...markdownBlocks(rest, scanned.markdownFrom + 1)]
}

type BlockScan = {
  readonly blocks: readonly DocumentBlock[]
  readonly markdownFrom: number
  readonly index: number
}

function nextBlock(
  scan: BlockScan,
  lines: readonly string[],
  opening: string,
  index: number,
): BlockScan {
  if (index < scan.index) return scan
  if (!isNamed(opening)) return { ...scan, index: index + 1 }
  const markdown = lines.slice(scan.markdownFrom, index).join('\n')
  const closing = closingLine(lines, index + 1) ?? lines.length - 1
  return {
    blocks: [
      ...scan.blocks,
      ...markdownBlocks(markdown, scan.markdownFrom + 1),
      {
        kind: 'named',
        name: nameOf(opening),
        option: optionOf(opening),
        text: lines.slice(index + 1, closing).join('\n'),
      },
    ],
    markdownFrom: closing + 1,
    index: closing + 1,
  }
}

function markdownBlocks(markdown: string, firstLine: number): readonly DocumentBlock[] {
  return markdown.trim() === '' ? [] : [{ kind: 'markdown', text: markdown, firstLine }]
}

function closingLine(lines: readonly string[], from: number): number | undefined {
  const offset = lines.slice(from).findIndex((line) => line.trim() === blockFence)
  return offset === -1 ? undefined : from + offset
}

function isNamed(opening: string): boolean {
  return opening.startsWith(blockFence) && opening.slice(blockFence.length).trim() !== ''
}

function nameOf(opening: string): string {
  const [name = blockFence] = opening.slice(blockFence.length).trim().split(' ')
  return name
}

function optionOf(opening: string): string {
  return opening.slice(blockFence.length).trim().split(' ').slice(1).join(' ')
}

function htmlOfBlock(block: DocumentBlock): string {
  if (block.kind === 'markdown') return htmlOfMarkdown(block.text, block.firstLine)
  if (block.name === 'decision') return decisionPlaceholder(block.option)
  if (block.name === 'html') return htmlFrame(block.text)
  return agentNote(block.text)
}

function htmlOfMarkdown(text: string, firstLine: number): string {
  const tokens = parser.parse(text, {})
  markLines(tokens, firstLine)
  return parser.renderer.render(tokens, parser.options, {})
}

type MappedToken = Token & { readonly map: [number, number] }

function isMapped(token: Token): token is MappedToken {
  return token.level === 0 && MAPPED_TOKENS.includes(token.type) && token.map !== null
}

function markLines(tokens: readonly Token[], firstLine: number): void {
  for (const token of tokens.filter(isMapped)) {
    const [from, to] = token.map
    const first = from + firstLine
    const last = Math.max(first, to + firstLine - 1)
    token.attrSet('data-lines', `${String(first)}-${String(last)}`)
  }
}

function decisionPlaceholder(id: string): string {
  return `<div class="decision" data-decision="${parser.utils.escapeHtml(id)}"></div>\n`
}

function htmlFrame(text: string): string {
  return `<iframe class="html-block" sandbox data-html="${parser.utils.escapeHtml(text)}"></iframe>\n`
}

function agentNote(text: string): string {
  return `<aside class="agent-note">${parser.render(text)}</aside>\n`
}

function firstWordOf(text: string): string {
  const spaceAt = text.search(/\s/)
  return spaceAt === -1 ? text : text.slice(0, spaceAt)
}
