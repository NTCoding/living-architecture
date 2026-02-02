import {
  validateComponentType, validateHttpMethod, validateLinkType 
} from './validation'

interface LinkHttpOptions {
  toType: string
  method?: string
  linkType?: string
}

export function validateOptions(options: LinkHttpOptions): string | undefined {
  const componentTypeValidation = validateComponentType(options.toType)
  if (!componentTypeValidation.valid) {
    return componentTypeValidation.errorJson
  }

  const httpMethodValidation = validateHttpMethod(options.method)
  if (!httpMethodValidation.valid) {
    return httpMethodValidation.errorJson
  }

  const linkTypeValidation = validateLinkType(options.linkType)
  if (!linkTypeValidation.valid) {
    return linkTypeValidation.errorJson
  }

  return undefined
}
