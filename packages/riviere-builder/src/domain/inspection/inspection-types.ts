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

export type WarningCode = 'ORPHAN_COMPONENT' | 'UNUSED_DOMAIN'

export interface BuilderWarning {
  code: WarningCode
  message: string
  componentId?: string
  domainName?: string
}
