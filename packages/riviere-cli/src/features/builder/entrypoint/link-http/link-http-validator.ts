import {
  validateComponentType,
  validateHttpMethod,
  validateLinkType,
} from '../_platform/cli/validation'

interface LinkHttpOptions {
  linkType?: string
  method?: string
  toType: string
}

/** @riviere-role entrypoint-cli-input-parser */
export function validateOptions(options: LinkHttpOptions): string | undefined {
  const componentTypeValidation = validateComponentType(options.toType)
  if (!componentTypeValidation.valid) return componentTypeValidation.errorJson
  const httpMethodValidation = validateHttpMethod(options.method)
  if (!httpMethodValidation.valid) return httpMethodValidation.errorJson
  const linkTypeValidation = validateLinkType(options.linkType)
  if (!linkTypeValidation.valid) return linkTypeValidation.errorJson
  return undefined
}
