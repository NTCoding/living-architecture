import { CliErrorCode } from './error-codes'

/** @riviere-role cli-output-formatter */
export function getAddComponentHints(code: CliErrorCode): string[] {
  if (code === CliErrorCode.GraphNotFound) return ['Run riviere builder init first']
  if (code === CliErrorCode.DomainNotFound) return ['Run riviere builder add-domain first']
  if (code === CliErrorCode.CustomTypeNotFound) return ['Run riviere builder add-custom-type first']
  return []
}
