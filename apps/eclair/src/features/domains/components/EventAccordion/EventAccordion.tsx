import { useState } from 'react'
import type { DomainEvent } from '../../extractDomainDetails'
import { CodeLinkMenu } from '@/features/flows/components/CodeLinkMenu/CodeLinkMenu'

interface HandlerInfo {
  readonly domain: string
  readonly handlerName: string
}

interface EventAccordionProps {
  readonly event: DomainEvent
  readonly defaultExpanded?: boolean | undefined
  readonly onViewOnGraph?: (eventId: string) => void
  readonly onViewHandlerOnGraph?: (handler: HandlerInfo) => void
}

function formatHandlerCount(count: number): string {
  if (count === 0) return 'No handlers'
  return `${count} handler${count === 1 ? '' : 's'}`
}

interface EventHandlersSectionProps {
  readonly event: DomainEvent
  readonly onViewHandlerOnGraph: ((handler: HandlerInfo) => void) | undefined
}

function EventHandlersSection({ event, onViewHandlerOnGraph }: Readonly<EventHandlersSectionProps>): React.ReactElement | null {
  if (event.handlers.length > 0) {
    return (
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
          <i className="ph ph-ear text-[var(--accent)]" aria-hidden="true" />
          Handlers
        </div>
        <div className="space-y-2">
          {event.handlers.map((handler) => (
            <div
              key={`${handler.domain}-${handler.handlerName}`}
              data-testid="handler-row"
              className="flex items-center gap-3 rounded-lg bg-[var(--bg-tertiary)] px-3 py-2"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--primary)] text-white">
                <i className="ph ph-ear text-sm" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <span
                  data-testid="handler-name"
                  className="block truncate font-[var(--font-mono)] text-sm font-semibold text-[var(--text-primary)]"
                >
                  {handler.handlerName}
                </span>
                <span data-testid="handler-domain" className="text-xs text-[var(--text-secondary)]">
                  {handler.domain}
                </span>
              </div>
              {onViewHandlerOnGraph !== undefined && (
                <button
                  type="button"
                  className="graph-link-btn-sm"
                  title="View handler on graph"
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewHandlerOnGraph({ domain: handler.domain, handlerName: handler.handlerName })
                  }}
                >
                  <i className="ph ph-graph" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (event.schema === undefined) {
    return (
      <div className="text-sm italic text-[var(--text-tertiary)]">
        No schema or handlers defined
      </div>
    )
  }

  return null
}

export function EventAccordion({
  event,
  defaultExpanded = false,
  onViewOnGraph,
  onViewHandlerOnGraph,
}: Readonly<EventAccordionProps>): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handlerCount = event.handlers.length

  return (
    <div className="rounded-lg border border-[var(--border-color)]">
      <div
        className={`flex w-full items-center justify-between gap-4 p-4 transition-colors ${
          isExpanded
            ? 'border-b border-[var(--accent)] bg-gradient-to-r from-[rgba(245,158,11,0.08)] to-[rgba(251,191,36,0.08)]'
            : 'bg-[var(--bg-secondary)] shadow-sm hover:border-[var(--accent)]'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--node-event)] text-white">
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
        </button>
        <div className="flex items-center gap-2">
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
      </div>

      {isExpanded && (
        <div className="border-t border-[var(--accent)] bg-[var(--bg-secondary)] p-4">
          {event.schema !== undefined && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                <i className="ph ph-brackets-curly text-[var(--accent)]" aria-hidden="true" />
                Schema
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-[var(--bg-tertiary)] p-3 font-[var(--font-mono)] text-xs text-[var(--text-secondary)]">
                {event.schema}
              </pre>
            </div>
          )}

          <EventHandlersSection event={event} onViewHandlerOnGraph={onViewHandlerOnGraph} />
        </div>
      )}
    </div>
  )
}
