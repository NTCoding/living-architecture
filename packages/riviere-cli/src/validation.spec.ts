import {
 describe, it, expect 
} from 'vitest';
import {
  validateComponentType,
  validateLinkType,
  validateSystemType,
  validateHttpMethod,
  isValidHttpMethod,
} from './validation';
import { CliErrorCode } from './error-codes';

describe('validation', () => {
  describe('validateComponentType', () => {
    it('returns valid for UI component type', () => {
      expect(validateComponentType('UI')).toEqual({ valid: true });
    });

    it('returns valid for lowercase component type', () => {
      expect(validateComponentType('api')).toEqual({ valid: true });
    });

    it('returns invalid with error for unknown type', () => {
      const result = validateComponentType('InvalidType');
      expect(result.valid).toBe(false);
      expect(result.errorJson).toBeDefined();
      const error: unknown = JSON.parse(result.errorJson ?? '');
      expect(error).toMatchObject({
        success: false,
        error: {
          code: CliErrorCode.ValidationError,
          message: 'Invalid component type: InvalidType',
        },
      });
    });
  });

  describe('validateLinkType', () => {
    it('returns valid for undefined link type', () => {
      expect(validateLinkType(undefined)).toEqual({ valid: true });
    });

    it('returns valid for sync link type', () => {
      expect(validateLinkType('sync')).toEqual({ valid: true });
    });

    it('returns valid for async link type', () => {
      expect(validateLinkType('async')).toEqual({ valid: true });
    });

    it('returns invalid with error for unknown link type', () => {
      const result = validateLinkType('invalid');
      expect(result.valid).toBe(false);
      expect(result.errorJson).toBeDefined();
      const error: unknown = JSON.parse(result.errorJson ?? '');
      expect(error).toMatchObject({
        success: false,
        error: {
          code: CliErrorCode.ValidationError,
          message: 'Invalid link type: invalid',
        },
      });
    });
  });

  describe('validateHttpMethod', () => {
    it('returns valid for undefined method', () => {
      expect(validateHttpMethod(undefined)).toEqual({ valid: true });
    });

    it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])(
      'returns valid for %s',
      (method) => {
        expect(validateHttpMethod(method)).toEqual({ valid: true });
      },
    );

    it('returns valid for lowercase method', () => {
      expect(validateHttpMethod('get')).toEqual({ valid: true });
    });

    it('returns invalid with error for unknown method', () => {
      const result = validateHttpMethod('INVALID');
      expect(result.valid).toBe(false);
      expect(result.errorJson).toBeDefined();
      const error: unknown = JSON.parse(result.errorJson ?? '');
      expect(error).toMatchObject({
        success: false,
        error: {
          code: CliErrorCode.ValidationError,
          message: 'Invalid HTTP method: INVALID',
        },
      });
    });
  });

  describe('isValidHttpMethod', () => {
    it('returns true for valid HTTP methods', () => {
      expect(isValidHttpMethod('GET')).toBe(true);
      expect(isValidHttpMethod('post')).toBe(true);
    });

    it('returns false for invalid HTTP methods', () => {
      expect(isValidHttpMethod('INVALID')).toBe(false);
    });
  });

  describe('validateSystemType', () => {
    it.each(['domain', 'bff', 'ui', 'other'])(
      'returns valid for %s',
      (type) => {
        expect(validateSystemType(type)).toEqual({ valid: true });
      },
    );

    it('returns invalid with error for unknown system type', () => {
      const result = validateSystemType('backend');
      expect(result.valid).toBe(false);
      expect(result.errorJson).toBeDefined();
      const error: unknown = JSON.parse(result.errorJson ?? '');
      expect(error).toMatchObject({
        success: false,
        error: {
          code: CliErrorCode.ValidationError,
          message: 'Invalid system type: backend',
        },
      });
    });
  });
});
