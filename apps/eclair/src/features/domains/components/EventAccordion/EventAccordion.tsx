import { useState, useMemo } from 'react'
import type { DomainEvent } from '../../extractDomainDetails'
import { CodeLinkMenu } from '@/features/flows/components/CodeLinkMenu'

interface EventAccordionProps {
  event: DomainEvent
  defaultExpanded?: boolean | undefined
  onViewOnGraph?: (eventId: string) => void
}

function formatHandlerCount(count: number): string {
  if (count === 0) return 'No handlers'
  return `${count} handler${count !== 1 ? 's' : ''}`
}

export function EventAccordion({
  event,
  defaultExpanded = false,
  onViewOnGraph,
}: EventAccordionProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handlerCount = event.handlers.length

  return (
    <div className="rounded-lg border border-[var(--border-color)]">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className={`flex w-full items-center justify-between gap-4 p-4 text-left transition-colors ${
          isExpanded
            ? 'border-b border-[var(--accent)] bg-gradient-to-r from-[rgba(245,158,11,0.08)] to-[rgba(251,191,36,0.08)]'
            : 'bg-[var(--bg-secondary)] shadow-sm hover:border-[var(--accent)]'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)] to-[#F59E0B] text-white">
            <i className="ph ph-lightning text-lg" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="block truncate font-[var(--font-mono)] text-sm font-bold text-[var(--text-primary)]">
              {event.eventName}
            </span>
            <span className="block text-xs text-[var(--text-tertiary)]">
              {formatHandlerCount(handlerCount)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {event.sourceLocation !== undefined && event.sourceLocation.lineNumber !== undefined && (
            <CodeLinkMenu
              filePath={event.sourceLocation.filePath}
              lineNumber={event.sourceLocation.lineNumber}
              repository={event.sourceLocation.repository}
            />
          )}
          {onViewOnGraph !== undefined && (
            <button
              type="button"
              className="graph-link-btn-sm"
              title="View on Graph"
              onClick={(e) => {
                e.stopPropagation()
                onViewOnGraph(event.id)
              }}
            >
              <i className="ph ph-graph" aria-hidden="true" />
            </button>
          )}
          <i
            className={`ph ${isExpanded ? 'ph-caret-up' : 'ph-caret-down'} shrink-0 text-[var(--text-tertiary)]`}
            aria-hidden="true"
          />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[var(--accent)] bg-[var(--bg-secondary)] p-4">
          {event.schema !== undefined && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                <i className="ph ph-brackets-curly text-[var(--accent)]" aria-hidden="true" />
                Schema
              </div>
              <SchemaHighlight schema={event.schema} />
            </div>
          )}

          {event.handlers.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                <i className="ph ph-ear text-[var(--accent)]" aria-hidden="true" />
                Handlers
              </div>
              <div className="space-y-2">
                {event.handlers.map((handler) => (
                  <div
                    key={`${handler.domain}-${handler.handlerName}`}
                    className="flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)] px-3 py-2"
                  >
                    <span className="font-[var(--font-mono)] text-sm text-[var(--text-primary)]">
                      {handler.handlerName}
                    </span>
                    <span className="rounded bg-[var(--bg-secondary)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
                      {handler.domain}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface SchemaHighlightProps {
  schema: Record<string, unknown>
}

function SchemaHighlight({ schema }: SchemaHighlightProps): React.ReactElement {
  const formatted = useMemo(() => JSON.stringify(schema, null, 2), [schema])
  const tokens = useMemo(() => highlightTypeSchema(formatted), [formatted])

  return (
    <pre className="overflow-x-auto rounded-lg bg-[var(--bg-tertiary)] p-3 font-[var(--font-mono)] text-xs">
      {tokens.map((token, i) => (
        <span key={i} className={tokenColorClass(token.type)}>
          {token.value}
        </span>
      ))}
    </pre>
  )
}

type TokenType = 'key' | 'string' | 'type' | 'punctuation' | 'plain'

interface Token {
  type: TokenType
  value: string
}

function tokenColorClass(type: TokenType): string {
  switch (type) {
    case 'key':
      return 'text-[var(--primary)]'
    case 'string':
      return 'text-[#10B981]'
    case 'type':
      return 'text-[#8B5CF6]'
    case 'punctuation':
      return 'text-[var(--text-tertiary)]'
    case 'plain':
    default:
      return 'text-[var(--text-secondary)]'
  }
}

const PRIMITIVE_TYPES = new Set(['string', 'number', 'boolean', 'null', 'undefined', 'timestamp'])

function processKeyToken(match: RegExpExecArray, schema: string): Token[] {
  const key = match[1]
  if (key === undefined) return []
  const tokens: Token[] = []
  tokens.push({ type: 'key', value: key })
  const colonStart = match.index + key.length
  const colonEnd = match.index + match[0].length
  tokens.push({ type: 'punctuation', value: schema.slice(colonStart, colonEnd) })
  return tokens
}

function processStringToken(match: RegExpExecArray): Token[] {
  if (match[2] === undefined && match[3] === undefined) {
    throw new Error('String token regex failed: no match group captured')
  }
  const value = match[2] ?? match[3]
  if (value === undefined) {
    throw new Error('String token regex failed: both match groups are undefined')
  }
  return [{ type: 'string', value }]
}

function processIdentifierToken(match: RegExpExecArray): Token[] {
  const identifier = match[4]
  if (identifier === undefined) return []
  const baseType = identifier.replace('[]', '')
  const firstChar = baseType[0]
  const isType = PRIMITIVE_TYPES.has(baseType) || (firstChar !== undefined && firstChar === firstChar.toUpperCase())
  return [{ type: isType ? 'type' : 'plain', value: identifier }]
}

function processPunctuationToken(match: RegExpExecArray): Token[] {
  const punctuation = match[5]
  if (punctuation === undefined) return []
  return [{ type: 'punctuation', value: punctuation }]
}

function processToken(match: RegExpExecArray, schema: string): Token[] {
  if (match[1] !== undefined) return processKeyToken(match, schema)
  if (match[2] !== undefined || match[3] !== undefined) return processStringToken(match)
  if (match[4] !== undefined) return processIdentifierToken(match)
  if (match[5] !== undefined) return processPunctuationToken(match)
  return []
}

function appendRemainingText(tokens: Token[], schema: string, startIndex: number): void {
  if (startIndex < schema.length) {
    tokens.push({ type: 'plain', value: schema.slice(startIndex) })
  }
}

function highlightTypeSchema(schema: string): Token[] {
  const regex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:|('(?:[^'\\]|\\.)*')|("(?:[^"\\]|\\.)*")|([a-zA-Z_][a-zA-Z0-9_]*(?:\[\])?)|([{}[\]:,<>|&?])/g

  function tokenizeMatches(tokens: Token[], lastIndex: number): Token[] {
    const match = regex.exec(schema)

    if (match === null) {
      appendRemainingText(tokens, schema, lastIndex)
      return tokens
    }

    if (match.index > lastIndex) {
      tokens.push({ type: 'plain', value: schema.slice(lastIndex, match.index) })
    }

    tokens.push(...processToken(match, schema))
    return tokenizeMatches(tokens, regex.lastIndex)
  }

  return tokenizeMatches([], 0)
}
