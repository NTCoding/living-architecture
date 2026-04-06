/** @riviere-role value-object */
export interface BuilderStats {
  componentCount: number
  componentsByType: {
    UI: number
    API: number
    UseCase: number
    DomainOp: number
    Event: number
    EventHandler: number
    Custom: number
  }
  linkCount: number
  externalLinkCount: number
  domainCount: number
}

/** @riviere-role value-object */
export type WarningCode = 'ORPHAN_COMPONENT' | 'UNUSED_DOMAIN'

/** @riviere-role value-object */
export interface BuilderWarning {
  code: WarningCode
  message: string
  componentId?: string
  domainName?: string
}
