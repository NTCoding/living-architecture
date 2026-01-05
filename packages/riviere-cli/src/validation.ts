import type { HttpMethod } from '@living-architecture/riviere-schema';
import {
  isValidComponentType,
  isValidLinkType,
  isValidSystemType,
  VALID_COMPONENT_TYPES,
  VALID_LINK_TYPES,
  VALID_SYSTEM_TYPES,
} from './component-types';
import { formatError } from './output';
import { CliErrorCode } from './error-codes';

export interface ValidationResult {
  valid: boolean;
  errorJson?: string;
}

export function validateComponentType(componentType: string): ValidationResult {
  if (isValidComponentType(componentType)) {
    return { valid: true };
  }

  return {
    valid: false,
    errorJson: JSON.stringify(
      formatError(
        CliErrorCode.ValidationError,
        `Invalid component type: ${componentType}`,
        [`Valid types: ${VALID_COMPONENT_TYPES.join(', ')}`],
      ),
    ),
  };
}

export function validateLinkType(
  linkType: string | undefined,
): ValidationResult {
  if (linkType === undefined || isValidLinkType(linkType)) {
    return { valid: true };
  }

  return {
    valid: false,
    errorJson: JSON.stringify(
      formatError(
        CliErrorCode.ValidationError,
        `Invalid link type: ${linkType}`,
        [`Valid types: ${VALID_LINK_TYPES.join(', ')}`],
      ),
    ),
  };
}

export function validateSystemType(systemType: string): ValidationResult {
  if (isValidSystemType(systemType)) {
    return { valid: true };
  }

  return {
    valid: false,
    errorJson: JSON.stringify(
      formatError(
        CliErrorCode.ValidationError,
        `Invalid system type: ${systemType}`,
        [`Valid types: ${VALID_SYSTEM_TYPES.join(', ')}`],
      ),
    ),
  };
}

const VALID_HTTP_METHODS: readonly HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];

export function isValidHttpMethod(value: string): value is HttpMethod {
  return VALID_HTTP_METHODS.some((m) => m === value.toUpperCase());
}

export function validateHttpMethod(
  method: string | undefined,
): ValidationResult {
  if (method === undefined || isValidHttpMethod(method)) {
    return { valid: true };
  }

  return {
    valid: false,
    errorJson: JSON.stringify(
      formatError(
        CliErrorCode.ValidationError,
        `Invalid HTTP method: ${method}`,
        [`Valid methods: ${VALID_HTTP_METHODS.join(', ')}`],
      ),
    ),
  };
}
