import { CliErrorCode } from './error-codes';

export interface SuccessOutput<T> {
  success: true;
  data: T;
  warnings: string[];
}

export interface ErrorOutput {
  success: false;
  error: {
    code: string;
    message: string;
    suggestions: string[];
  };
}

export function formatSuccess<T>(
  data: T,
  warnings: string[] = [],
): SuccessOutput<T> {
  return {
    success: true,
    data,
    warnings 
  };
}

export function formatError(
  code: CliErrorCode,
  message: string,
  suggestions: string[] = [],
): ErrorOutput {
  return {
    success: false,
    error: {
      code,
      message,
      suggestions 
    } 
  };
}
