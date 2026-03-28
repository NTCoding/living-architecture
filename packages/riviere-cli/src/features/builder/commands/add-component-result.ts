import { CliErrorCode } from '../../../platform/infra/cli-presentation/error-codes'

/** @riviere-role command-use-case-result */
export type AddComponentResult =
  | {
    success: true
    componentId: string
  }
  | {
    success: false
    code: CliErrorCode
    message: string
  }
