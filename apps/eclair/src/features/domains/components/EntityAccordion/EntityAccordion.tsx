import { useState } from 'react'
import type { Entity } from '@living-architecture/riviere-query'
import type { DomainOpComponent } from '@living-architecture/riviere-schema'
import { CodeLinkMenu } from '@/features/flows/components/CodeLinkMenu/CodeLinkMenu'

interface EntityAccordionProps {
  entity: Entity
  defaultExpanded?: boolean | undefined
  onViewOnGraph?: (nodeId: string) => void
}

interface EntityHeaderActionsProps {
  entity: Entity
  isExpanded: boolean
  onViewOnGraph: ((nodeId: string) => void) | undefined
}

function EntityHeaderActions({ entity, isExpanded, onViewOnGraph }: EntityHeaderActionsProps): React.ReactElement {
  const firstOp = entity.operations[0]
  const firstOpId = entity.firstOperationId()

  return (
    <div className="flex items-center gap-2">
      {firstOp?.sourceLocation?.lineNumber !== undefined && (
        <CodeLinkMenu
          filePath={firstOp.sourceLocation.filePath}
          lineNumber={firstOp.sourceLocation.lineNumber}
          repository={firstOp.sourceLocation.repository}
        />
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
}: EntityAccordionProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const operationCount = entity.operations.length
  const stateCount = entity.states.length

  return (
    <div className="rounded-lg border border-[var(--border-color)]">
      <div
        className={`flex w-full items-center justify-between gap-4 p-4 transition-colors ${
          isExpanded
            ? 'border-b border-[#8B5CF6] bg-gradient-to-r from-[rgba(139,92,246,0.08)] to-[rgba(124,58,237,0.08)]'
            : 'bg-[var(--bg-secondary)] shadow-sm hover:border-[#8B5CF6]'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] text-white">
            <i className="ph ph-cube text-lg" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="block truncate font-[var(--font-mono)] text-sm font-bold text-[var(--text-primary)]">
              {entity.name}
            </span>
            <span className="block text-xs text-[var(--text-tertiary)]">
              {operationCount} operation{operationCount !== 1 ? 's' : ''}
              {stateCount > 0 && ` · ${stateCount} state${stateCount !== 1 ? 's' : ''}`}
            </span>
          </div>
        </button>
        <EntityHeaderActions entity={entity} isExpanded={isExpanded} onViewOnGraph={onViewOnGraph} />
      </div>

      {isExpanded && (
        <div className="border-t border-[#8B5CF6] bg-[var(--bg-secondary)] p-4">
          {entity.hasStates() && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                <i className="ph ph-flow-arrow text-[var(--primary)]" aria-hidden="true" />
                State Machine
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--bg-tertiary)] p-3">
                {entity.states.map((state, index) => (
                  <div key={state} className="flex items-center gap-2">
                    <span className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      index === 0
                        ? 'border-[var(--green)] bg-[rgba(16,185,129,0.1)] text-[var(--text-primary)]'
                        : index === entity.states.length - 1
                          ? 'border-[#8B5CF6] bg-[rgba(139,92,246,0.1)] text-[var(--text-primary)]'
                          : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                    }`}>
                      {state}
                    </span>
                    {index < entity.states.length - 1 && (
                      <span className="text-[var(--text-tertiary)]">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {entity.hasBusinessRules() && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                <i className="ph ph-shield-check text-[var(--primary)]" aria-hidden="true" />
                Business Rules
              </div>
              <div className="space-y-2">
                {entity.businessRules.map((rule, index) => (
                  <div key={index} className="flex items-start gap-2 rounded-lg bg-[var(--bg-tertiary)] p-3 text-sm text-[var(--text-secondary)]">
                    <i className="ph ph-check-circle shrink-0 text-[var(--amber)]" aria-hidden="true" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {entity.operations.length > 0 ? (
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                <i className="ph ph-code text-[var(--primary)]" aria-hidden="true" />
                Methods
              </div>
              <div className="space-y-3">
                {entity.operations.map((op) => (
                  <MethodCard key={op.id} operation={op} businessRules={entity.businessRules} />
                ))}
              </div>
            </div>
          ) : !entity.hasStates() && !entity.hasBusinessRules() ? (
            <div className="text-sm italic text-[var(--text-tertiary)]">
              No states, rules, or methods defined
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

interface MethodCardProps {
  operation: DomainOpComponent
  businessRules: string[]
}

function MethodCard({ operation, businessRules }: MethodCardProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="rounded-lg bg-[var(--bg-secondary)] shadow-sm">
      <MethodCardHeader operation={operation} isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} />
      {isExpanded && operation.behavior !== undefined && (
        <MethodCardContent behavior={operation.behavior} businessRules={businessRules} />
      )}
    </div>
  )
}

interface MethodCardHeaderProps {
  operation: DomainOpComponent
  isExpanded: boolean
  onToggle: () => void
}

function MethodCardHeader({ operation, isExpanded, onToggle }: MethodCardHeaderProps): React.ReactElement {
  return (
    <div
      className={`flex w-full items-center justify-between gap-4 px-4 py-3 transition-colors ${
        isExpanded ? 'border-b border-[var(--border-color)] bg-[var(--bg-secondary)]' : ''
      }`}
    >
      <MethodCardButton operation={operation} isExpanded={isExpanded} onToggle={onToggle} />
      <MethodCardAction operation={operation} />
    </div>
  )
}

interface MethodCardButtonProps {
  operation: DomainOpComponent
  isExpanded: boolean
  onToggle: () => void
}

function MethodCardButton({ operation, isExpanded, onToggle }: MethodCardButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      className="flex min-w-0 flex-1 items-center gap-3 text-left hover:opacity-80"
    >
      <MethodSignature operation={operation} />
      <StateChangesTag operation={operation} />
      <MethodCardChevron isExpanded={isExpanded} />
    </button>
  )
}

interface MethodSignatureProps {
  operation: DomainOpComponent
}

function formatParameters(signature: NonNullable<MethodSignatureProps['operation']['signature']>): string {
  if (signature.parameters === undefined) {
    return ''
  }
  return signature.parameters.map(p => `${p.name}: ${p.type}`).join(', ')
}

function MethodSignature({ operation }: MethodSignatureProps): React.ReactElement {
  return (
    <span className="truncate font-[var(--font-mono)] text-sm">
      <span className="font-semibold text-[var(--primary)]">{operation.operationName}</span>
      {operation.signature !== undefined && (
        <>
          <span className="text-[var(--text-secondary)]">({formatParameters(operation.signature)})</span>
          {operation.signature.returnType !== undefined && (
            <span className="text-[#8B5CF6]">: {operation.signature.returnType}</span>
          )}
        </>
      )}
    </span>
  )
}

interface StateChangesTagProps {
  operation: DomainOpComponent
}

function hasStateChanges(
  operation: DomainOpComponent
): operation is DomainOpComponent & { stateChanges: NonNullable<DomainOpComponent['stateChanges']> } {
  return operation.stateChanges !== undefined && operation.stateChanges.length > 0
}

function StateChangesTag({ operation }: StateChangesTagProps): React.ReactElement {
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

interface MethodCardChevronProps {
  isExpanded: boolean
}

function MethodCardChevron({ isExpanded }: MethodCardChevronProps): React.ReactElement {
  return (
    <i
      className={`ph ${isExpanded ? 'ph-caret-up' : 'ph-caret-down'} shrink-0 text-[var(--text-tertiary)]`}
      aria-hidden="true"
    />
  )
}

interface MethodCardActionProps {
  operation: DomainOpComponent
}

function MethodCardAction({ operation }: MethodCardActionProps): React.ReactElement {
  const sourceLocation = operation.sourceLocation

  if (sourceLocation === undefined || sourceLocation.lineNumber === undefined) {
    return <></>
  }

  return (
    <CodeLinkMenu
      filePath={sourceLocation.filePath}
      lineNumber={sourceLocation.lineNumber}
      repository={sourceLocation.repository}
    />
  )
}

interface MethodCardContentProps {
  behavior: Exclude<DomainOpComponent['behavior'], undefined>
  businessRules: string[]
}

function MethodCardContent({ behavior, businessRules }: MethodCardContentProps): React.ReactElement {
  const hasRulesToShow = businessRules.length > 0

  return (
    <div className="p-4" data-testid="method-card-content">
      {hasRulesToShow && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
            <i className="ph ph-shield-check text-[var(--primary)]" aria-hidden="true" />
            Governed by
          </div>
          <div className="space-y-1">
            {businessRules.map((rule, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <i className="ph ph-check-circle shrink-0 text-[var(--amber)]" aria-hidden="true" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <BehaviorBox label="Reads" items={behavior.reads} icon="ph-book-open" color="blue" />
        <BehaviorBox label="Validates" items={behavior.validates} icon="ph-shield-check" color="amber" />
        <BehaviorBox label="Modifies" items={behavior.modifies} icon="ph-pencil-simple" color="green" />
        <BehaviorBox label="Emits" items={behavior.emits} icon="ph-broadcast" color="purple" />
      </div>
    </div>
  )
}

interface BehaviorBoxProps {
  label: string
  items: string[] | undefined
  icon: string
  color: 'blue' | 'amber' | 'green' | 'purple'
}

const colorStyles: Record<BehaviorBoxProps['color'], string> = {
  blue: 'border-l-[#06B6D4]',
  amber: 'border-l-[#F59E0B]',
  green: 'border-l-[#10B981]',
  purple: 'border-l-[#8B5CF6]',
}

function BehaviorBox({ label, items, icon, color }: BehaviorBoxProps): React.ReactElement {
  const hasItems = items !== undefined && items.length > 0

  return (
    <div className={`overflow-hidden rounded border-l-4 bg-[var(--bg-secondary)] p-3 ${colorStyles[color]} ${
      hasItems ? '' : 'opacity-50'
    }`}>
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
        <i className={`ph ${icon}`} aria-hidden="true" />
        {label}
      </div>
      {hasItems && (
        <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
          {items.map((item) => (
            <li key={item} className="truncate" title={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
