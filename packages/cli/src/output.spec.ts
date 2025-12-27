import { formatSuccess, formatError, type SuccessOutput, type ErrorOutput } from './output';
import { CliErrorCode } from './error-codes';

describe('formatSuccess', () => {
  it('returns success output with data', () => {
    const data = { count: 5 };

    const result = formatSuccess(data);

    expect(result).toEqual({
      success: true,
      data: { count: 5 },
      warnings: [],
    } satisfies SuccessOutput<typeof data>);
  });

  it('includes warnings when provided', () => {
    const data = { name: 'test' };
    const warnings = ['Deprecated field used'];

    const result = formatSuccess(data, warnings);

    expect(result).toEqual({
      success: true,
      data: { name: 'test' },
      warnings: ['Deprecated field used'],
    } satisfies SuccessOutput<typeof data>);
  });
});

describe('formatError', () => {
  it('returns error output with code and message', () => {
    const result = formatError(
      CliErrorCode.GraphNotFound,
      'No graph found at .riviere/graph.json'
    );

    expect(result).toEqual({
      success: false,
      error: {
        code: 'GRAPH_NOT_FOUND',
        message: 'No graph found at .riviere/graph.json',
        suggestions: [],
      },
    } satisfies ErrorOutput);
  });

  it('includes suggestions when provided', () => {
    const result = formatError(
      CliErrorCode.ComponentNotFound,
      "Component 'orders:api:place-ordr' not found",
      ['orders:api:place-order', 'orders:api:get-order']
    );

    expect(result).toEqual({
      success: false,
      error: {
        code: 'COMPONENT_NOT_FOUND',
        message: "Component 'orders:api:place-ordr' not found",
        suggestions: ['orders:api:place-order', 'orders:api:get-order'],
      },
    } satisfies ErrorOutput);
  });
});
