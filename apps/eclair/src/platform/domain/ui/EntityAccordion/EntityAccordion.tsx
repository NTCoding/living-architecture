import { useState } from 'react'
import type { DomainOpComponent } from '@living-architecture/riviere-schema'
import { BehaviorBox } from './BehaviorBox'
import { MethodCardChevron } from './MethodCardChevron'
import type { EntityAccordionModel, EntityAccordionProps } from './entity-accordion-model'

interface EntityHeaderActionsProps {
  readonly entity: EntityAccordionModel
  readonly isExpanded: boolean
  readonly onViewOnGraph: ((nodeId: string) => void) | undefined
  readonly renderCodeLink: EntityAccordionProps['renderCodeLink']
}

function EntityHeaderActions({
  entity,
  isExpanded,
  onViewOnGraph,
  renderCodeLink,
}: Readonly<EntityHeaderActionsProps>): React.ReactElement {
  const firstOp = entity.operations[0]
  const firstOpId = firstOp?.id

  return (
    <div className="flex items-center gap-2">
      {firstOp?.sourceLocation.lineNumber !== undefined && renderCodeLink !== undefined && (
        <>{renderCodeLink({
          filePath: firstOp.sourceLocation.filePath,
          lineNumber: firstOp.sourceLocation.lineNumber,
          repository: firstOp.sourceLocation.repository,
        })}</>
      )}
      {onViewOnGraph !== undefined && firstOpId !== undefined && (
        <button
          type="button"
          className="graph-link-btn-sm"
          title="View on Graph"
          onClick={(e) => {
            e.stopPropagation()
            onViewOnGraph(firstOpId)
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
  )
}

export function EntityAccordion({
  entity,
  defaultExpanded = false,
  onViewOnGraph,
  renderCodeLink,
}: Readonly<EntityAccordionProps>): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const operationCount = entity.operations.length
  const stateCount = entity.states.length

  return (
    <div className="rounded-lg border border-[var(--border-color)]">
      <div
        className={`flex w-full items-center justify-between gap-4 p-4 transition-colors ${
          isExpanded
            ? 'border-b border-[var(--node-domainop)] bg-gradient-to-r from-[rgba(245,158,11,0.08)] to-[rgba(251,191,36,0.08)]'
            : 'bg-[var(--bg-secondary)] shadow-sm hover:border-[var(--node-domainop)]'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--node-domainop)] text-white">
            <i className="ph ph-cube text-lg" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="block truncate font-[var(--font-mono)] text-sm font-bold text-[var(--text-primary)]">
              {entity.name}
            </span>
            <span className="block text-xs text-[var(--text-tertiary)]">
              {operationCount} operation{operationCount === 1 ? '' : 's'}
              {stateCount > 0 && ` · ${stateCount} state${stateCount === 1 ? '' : 's'}`}
            </span>
          </div>
        </button>
        <EntityHeaderActions
          entity={entity}
          isExpanded={isExpanded}
          onViewOnGraph={onViewOnGraph}
          renderCodeLink={renderCodeLink}
        />
      </div>

      {isExpanded && (
        <div className="border-t border-[var(--node-domainop)] bg-[var(--bg-secondary)] p-4">
          {entity.states.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                <i className="ph ph-flow-arrow text-[var(--primary)]" aria-hidden="true" />
                State Machine
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--bg-tertiary)] p-3">
                {entity.states.map((state, index) => {
                  const getStateBorderClass = (): string => {
                    if (index === 0)
                      return 'border-[var(--green)] bg-[rgba(16,185,129,0.1)] text-[var(--text-primary)]'
                    if (index === entity.states.length - 1)
                      return 'border-[var(--node-domainop)] bg-[rgba(245,158,11,0.1)] text-[var(--text-primary)]'
                    return 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                  }
                  const borderClass = getStateBorderClass()
                  return (
                    <div key={state} className="flex items-center gap-2">
                      <span
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${borderClass}`}
                      >
                        {state}
                      </span>
                      {index < entity.states.length - 1 && (
                        <span className="text-[var(--text-tertiary)]">→</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {(() => {
            if (entity.operations.length > 0) {
              return (
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                    <i className="ph ph-code text-[var(--primary)]" aria-hidden="true" />
                    Methods
                  </div>
                  <div className="space-y-3">
                    {entity.operations.map((op) => (
                      <MethodCard
                        key={op.id}
                        operation={op}
                        businessRules={op.businessRules ?? []}
                        renderCodeLink={renderCodeLink}
                      />
                    ))}
                  </div>
                </div>
              )
            }
            if (entity.states.length === 0) {
              return (
                <div className="text-sm italic text-[var(--text-tertiary)]">
                  No states or methods defined
                </div>
              )
            }
            return null
          })()}
        </div>
      )}
    </div>
  )
}

interface MethodCardProps {
  readonly operation: DomainOpComponent
  readonly businessRules: readonly string[]
  readonly renderCodeLink: EntityAccordionProps['renderCodeLink']
}

function MethodCard({
  operation, businessRules, renderCodeLink,
}: Readonly<MethodCardProps>): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="rounded-lg bg-[var(--bg-secondary)] shadow-sm">
      <MethodCardHeader
        operation={operation}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        renderCodeLink={renderCodeLink}
      />
      {isExpanded && <MethodCardContent operation={operation} businessRules={businessRules} />}
    </div>
  )
}

interface MethodCardHeaderProps {
  readonly operation: DomainOpComponent
  readonly isExpanded: boolean
  readonly onToggle: () => void
  readonly renderCodeLink: EntityAccordionProps['renderCodeLink']
}

function MethodCardHeader({
  operation,
  isExpanded,
  onToggle,
  renderCodeLink,
}: Readonly<MethodCardHeaderProps>): React.ReactElement {
  return (
    <div
      className={`flex w-full items-center justify-between gap-4 px-4 py-3 transition-colors ${
        isExpanded ? 'border-b border-[var(--border-color)] bg-[var(--bg-secondary)]' : ''
      }`}
    >
      <MethodCardButton operation={operation} isExpanded={isExpanded} onToggle={onToggle} />
      <MethodCardAction operation={operation} renderCodeLink={renderCodeLink} />
    </div>
  )
}

interface MethodCardButtonProps {
  readonly operation: DomainOpComponent
  readonly isExpanded: boolean
  readonly onToggle: () => void
}

function MethodCardButton({
  operation,
  isExpanded,
  onToggle,
}: Readonly<MethodCardButtonProps>): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1 -mx-2 text-left transition-colors hover:bg-[var(--bg-tertiary)]"
    >
      <MethodSignature operation={operation} />
      <StateChangesTag operation={operation} />
      <MethodCardChevron isExpanded={isExpanded} />
    </button>
  )
}

interface MethodSignatureProps {readonly operation: DomainOpComponent}

function formatParameters(
  signature: NonNullable<MethodSignatureProps['operation']['signature']>,
): string {
  if (signature.parameters === undefined) {
    return ''
  }
  return signature.parameters.map((p) => `${p.name}: ${p.type}`).join(', ')
}

function MethodSignature({ operation }: Readonly<MethodSignatureProps>): React.ReactElement {
  return (
    <span className="truncate font-[var(--font-mono)] text-sm">
      <span className="font-semibold text-[var(--primary)]">{operation.operationName}</span>
      {operation.signature !== undefined && (
        <>
          <span className="text-[var(--text-secondary)]">
            ({formatParameters(operation.signature)})
          </span>
          {operation.signature.returnType !== undefined && (
            <span className="text-[var(--node-domainop)]">: {operation.signature.returnType}</span>
          )}
        </>
      )}
    </span>
  )
}

interface StateChangesTagProps {readonly operation: DomainOpComponent}

function hasStateChanges(
  operation: DomainOpComponent,
): operation is DomainOpComponent & {stateChanges: NonNullable<DomainOpComponent['stateChanges']>} {
  return operation.stateChanges !== undefined && operation.stateChanges.length > 0
}

function StateChangesTag({ operation }: Readonly<StateChangesTagProps>): React.ReactElement {
  if (!hasStateChanges(operation)) {
    return <></>
  }

  return (
    <span
      data-testid="state-transition"
      className="shrink-0 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
    >
      {operation.stateChanges.map((sc) => `${sc.from} → ${sc.to}`).join(' | ')}
    </span>
  )
}

interface MethodCardActionProps {
  readonly operation: DomainOpComponent
  readonly renderCodeLink: EntityAccordionProps['renderCodeLink']
}

function MethodCardAction({
  operation,
  renderCodeLink,
}: Readonly<MethodCardActionProps>): React.ReactElement {
  const sourceLocation = operation.sourceLocation

  if (sourceLocation.lineNumber === undefined || renderCodeLink === undefined) {
    return <></>
  }

  return (
    <>
      {renderCodeLink({
        filePath: sourceLocation.filePath,
        lineNumber: sourceLocation.lineNumber,
        repository: sourceLocation.repository,
      })}
    </>
  )
}

interface MethodCardContentProps {
  readonly operation: DomainOpComponent
  readonly businessRules: readonly string[]
}

function MethodCardContent({
  operation,
  businessRules,
}: Readonly<MethodCardContentProps>): React.ReactElement {
  const hasRulesToShow = businessRules.length > 0
  const hasBehavior = operation.behavior !== undefined
  const hasAnyContent = hasRulesToShow || hasBehavior

  return (
    <div className="p-4" data-testid="method-card-content">
      {hasRulesToShow && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
            <i className="ph ph-shield-check text-[var(--primary)]" aria-hidden="true" />
            Governed by
          </div>
          <div className="space-y-1">
            {businessRules.map((rule) => (
              <div
                key={rule}
                className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
              >
                <i className="ph ph-check-circle shrink-0 text-[var(--amber)]" aria-hidden="true" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {hasBehavior && (
        <div className="grid grid-cols-2 gap-3">
          <BehaviorBox
            label="Reads"
            items={operation.behavior.reads}
            icon="ph-book-open"
            color="blue"
          />
          <BehaviorBox
            label="Validates"
            items={operation.behavior.validates}
            icon="ph-shield-check"
            color="amber"
          />
          <BehaviorBox
            label="Modifies"
            items={operation.behavior.modifies}
            icon="ph-pencil-simple"
            color="green"
          />
          <BehaviorBox
            label="Emits"
            items={operation.behavior.emits}
            icon="ph-broadcast"
            color="purple"
          />
        </div>
      )}
      {!hasAnyContent && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] italic">
          <i className="ph ph-info" aria-hidden="true" />
          <span>No additional behavior information available</span>
        </div>
      )}
    </div>
  )
}
