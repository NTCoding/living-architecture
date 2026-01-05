import {
  describe, it, expect 
} from 'vitest';
import {
  levenshteinDistance, similarityScore 
} from './string-similarity';

describe('levenshteinDistance', () => {
  it.each([
    // Identical strings
    ['', '', 0],
    ['a', 'a', 0],
    ['OrderService', 'OrderService', 0],
    // Empty vs non-empty
    ['', 'abc', 3],
    ['abc', '', 3],
    // Single operations
    ['cat', 'hat', 1],
    ['cat', 'cats', 1],
    ['cats', 'cat', 1],
    ['ab', 'ba', 2],
    // Typos
    ['OrderService', 'OrdrService', 1],
    ['OrderService', 'OrderServce', 1],
    ['OrderService', 'OrdreService', 2],
    // Completely different
    ['abc', 'xyz', 3],
  ] as const)('("%s", "%s") returns %d', (a, b, expected) => {
    expect(levenshteinDistance(a, b)).toBe(expected);
  });
});

describe('similarityScore', () => {
  it.each([
    // Identical
    ['OrderService', 'OrderService', 1.0],
    ['a', 'a', 1.0],
    // Near matches (score > 0.6)
    ['OrderService', 'OrdrService', 0.917],
    ['OrderService', 'OrderServic', 0.917],
    ['PaymentProcessor', 'PaymentProcesor', 0.938],
    // Partial matches
    ['OrderService', 'OrderHandler', 0.417],
    // Case insensitive
    ['OrderService', 'orderservice', 1.0],
    ['ORDER', 'order', 1.0],
    // Low similarity (score < 0.6)
    ['OrderService', 'UserProfile', 0.333],
    ['abc', 'xyz', 0.0],
    // Empty strings
    ['', '', 1.0],
    ['abc', '', 0.0],
  ] as const)('("%s", "%s") returns ~%d', (a, b, expected) => {
    expect(similarityScore(a, b)).toBeCloseTo(expected, 2);
  });
});
