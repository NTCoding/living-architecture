import { CliErrorCode } from './error-codes';

describe('CliErrorCode', () => {
  it.each([
    ['GraphNotFound', 'GRAPH_NOT_FOUND'],
    ['ComponentNotFound', 'COMPONENT_NOT_FOUND'],
    ['DomainNotFound', 'DOMAIN_NOT_FOUND'],
    ['DuplicateComponent', 'DUPLICATE_COMPONENT'],
    ['InvalidLink', 'INVALID_LINK'],
    ['InvalidComponentType', 'INVALID_COMPONENT_TYPE'],
    ['ValidationError', 'VALIDATION_ERROR'],
    ['GraphCorrupted', 'GRAPH_CORRUPTED'],
    ['GraphExists', 'GRAPH_EXISTS'],
  ] as const)('defines %s error code with value %s', (member, value) => {
    expect(CliErrorCode[member]).toBe(value);
  });
});
