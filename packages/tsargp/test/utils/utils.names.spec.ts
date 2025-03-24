import { describe, expect, it, jest } from 'bun:test';
import { gestaltSimilarity, findSimilar, matchNamingRules } from '../../src/library/utils';

describe('gestaltSimilarity', () => {
  it('return NaN on empty strings', () => {
    expect(gestaltSimilarity('', '')).toBeNaN();
  });

  it('return a percentage of the number of different characters', () => {
    // cSpell:disable
    expect(gestaltSimilarity('aaaaa', 'aaaaa')).toEqual(1);
    expect(gestaltSimilarity('aaaaa', 'baaaa')).toEqual(0.8);
    expect(gestaltSimilarity('aaaaa', 'bbaaa')).toEqual(0.6);
    expect(gestaltSimilarity('aaaaa', 'bbbaa')).toEqual(0.4);
    expect(gestaltSimilarity('aaaaa', 'bbbba')).toEqual(0.2);
    expect(gestaltSimilarity('aaaaa', 'bbbbb')).toEqual(0);
    // cSpell:enable
  });

  it('return less similarity when characters are swapped', () => {
    // cSpell:disable
    expect(gestaltSimilarity('flag', 'galf')).toBeCloseTo(0.25, 2);
    expect(gestaltSimilarity('flag', 'glaf')).toBeCloseTo(0.5, 2);
    expect(gestaltSimilarity('flag', 'fgxx')).toBeCloseTo(0.5, 2);
    expect(gestaltSimilarity('flag', 'gfxx')).toBeCloseTo(0.25, 2);
    // cSpell:enable
  });
});

describe('findSimilar', () => {
  it('handle empty names', () => {
    expect(findSimilar('', ['abc'])).toHaveLength(1);
    expect(findSimilar('abc', [])).toHaveLength(0);
  });

  it('return names in decreasing order of similarity ', () => {
    const haystack = ['a', 'ab', 'abc', 'abcd'];
    expect(findSimilar('abc', haystack)).toEqual(['abcd', 'ab', 'a']);
  });

  it('filter names by similarity threshold', () => {
    const haystack = ['a', 'ab', 'abc', 'abcd'];
    expect(findSimilar('abc', haystack, 0.6)).toEqual(['abcd', 'ab']);
  });

  it('avoid including transitively similar names', () => {
    const haystack = ['a', 'ab', 'abc', 'abcd', 'abcde'];
    // the following does not include 'abc', even though it is similar to 'ab'
    expect(findSimilar('a', haystack, 0.6)).toEqual(['ab']);
    expect(findSimilar('ab', haystack, 0.6)).toEqual(['abc', 'a', 'abcd']);
  });
});

describe('matchNamingRules', () => {
  it('match the first name against each rule in a ruleset', () => {
    const rules = {
      ruleset: {
        rule1: jest.fn((name) => name.startsWith('Match')),
        rule2: jest.fn(() => false),
      },
    } as const;
    const match = matchNamingRules(['Match1', 'Non-match', 'Match2'], rules);
    expect(match).toEqual({ ruleset: { rule1: 'Match1' } });
    expect(rules.ruleset.rule1).toHaveBeenCalledWith('Match1', 'match1', 'MATCH1');
    expect(rules.ruleset.rule1).not.toHaveBeenCalledWith(
      'Non-match',
      expect.anything(),
      expect.anything(),
    );
    expect(rules.ruleset.rule1).not.toHaveBeenCalledWith(
      'Match2',
      expect.anything(),
      expect.anything(),
    );
    expect(rules.ruleset.rule1).toHaveBeenCalledTimes(1);
    expect(rules.ruleset.rule2).toHaveBeenCalledTimes(3);
  });
});
