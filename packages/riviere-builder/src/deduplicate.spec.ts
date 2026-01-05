import {
  deduplicateStrings, deduplicateStateTransitions 
} from './deduplicate';

describe('deduplicateStrings', () => {
  it('returns all incoming when no existing', () => {
    const result = deduplicateStrings([], ['a', 'b']);
    expect(result).toEqual(['a', 'b']);
  });

  it('filters out duplicates', () => {
    const result = deduplicateStrings(['a', 'b'], ['b', 'c']);
    expect(result).toEqual(['c']);
  });

  it('returns empty when all duplicates', () => {
    const result = deduplicateStrings(['a', 'b'], ['a', 'b']);
    expect(result).toEqual([]);
  });
});

describe('deduplicateStateTransitions', () => {
  it('returns all incoming when no existing', () => {
    const result = deduplicateStateTransitions([], [{
      from: 'a',
      to: 'b' 
    }]);
    expect(result).toEqual([{
      from: 'a',
      to: 'b' 
    }]);
  });

  it('filters out duplicates by from and to', () => {
    const result = deduplicateStateTransitions(
      [{
        from: 'a',
        to: 'b' 
      }],
      [
        {
          from: 'a',
          to: 'b' 
        },
        {
          from: 'b',
          to: 'c' 
        },
      ],
    );
    expect(result).toEqual([{
      from: 'b',
      to: 'c' 
    }]);
  });

  it('treats different triggers as non-duplicates', () => {
    const result = deduplicateStateTransitions(
      [{
        from: 'a',
        to: 'b' 
      }],
      [{
        from: 'a',
        to: 'b',
        trigger: 'submit' 
      }],
    );
    expect(result).toEqual([{
      from: 'a',
      to: 'b',
      trigger: 'submit' 
    }]);
  });

  it('filters duplicates including trigger', () => {
    const result = deduplicateStateTransitions(
      [{
        from: 'a',
        to: 'b',
        trigger: 'submit' 
      }],
      [{
        from: 'a',
        to: 'b',
        trigger: 'submit' 
      }],
    );
    expect(result).toEqual([]);
  });

  it('returns empty when all duplicates', () => {
    const result = deduplicateStateTransitions(
      [
        {
          from: 'a',
          to: 'b' 
        },
        {
          from: 'b',
          to: 'c' 
        },
      ],
      [
        {
          from: 'a',
          to: 'b' 
        },
        {
          from: 'b',
          to: 'c' 
        },
      ],
    );
    expect(result).toEqual([]);
  });
});
