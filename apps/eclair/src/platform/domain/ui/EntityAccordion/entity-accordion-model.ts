import type { DomainOpComponent } from '@living-architecture/riviere-schema'

export interface EntityAccordionModel {
  readonly name: string
  readonly operations: readonly DomainOpComponent[]
  readonly states: readonly string[]
}

export interface EntityAccordionSourceLocation {
  readonly filePath: string
  readonly lineNumber: number
  readonly repository: string
}

export interface EntityAccordionProps {
  readonly entity: EntityAccordionModel
  readonly defaultExpanded?: boolean | undefined
  readonly onViewOnGraph?: (nodeId: string) => void
  readonly renderCodeLink?: (sourceLocation: EntityAccordionSourceLocation) => React.ReactNode
}
