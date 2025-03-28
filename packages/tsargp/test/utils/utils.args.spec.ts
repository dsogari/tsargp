import { describe, expect, it } from 'bun:test';
import { getArgs } from '../../src/library/utils';

describe('getArgs', () => {
  describe('no completion index is provided', () => {
    it('return empty array on zero arguments', () => {
      expect(getArgs('')).toEqual([]);
      expect(getArgs('cmd')).toEqual([]);
    });

    it('ignore leading and trailing whitespace', () => {
      expect(getArgs(' cmd ')).toEqual([]);
      expect(getArgs(' cmd  type  script ')).toEqual(['type', 'script']);
    });

    it('handle quoted arguments', () => {
      expect(getArgs(`cmd "" ''`)).toEqual(['', '']);
      expect(getArgs(`cmd " " ' '`)).toEqual([' ', ' ']);
      expect(getArgs(`cmd "'" '"'`)).toEqual([`'`, '"']);
      expect(getArgs(`cmd "type script" 'is fun'`)).toEqual(['type script', 'is fun']);
      expect(getArgs(`cmd type" "script' 'is fun`)).toEqual(['type script is', 'fun']);
      expect(getArgs(`cmd "'type' script" 'is "fun"'`)).toEqual([`'type' script`, 'is "fun"']);
    });

    it('handle escaped characters', () => {
      expect(getArgs(`cmd type\\ script`)).toEqual(['type script']);
      expect(getArgs(`cmd type\\\\script`)).toEqual(['type\\script']);
      expect(getArgs(`cmd "type\\ script"`)).toEqual(['type\\ script']);
      expect(getArgs(`cmd 'type\\ script'`)).toEqual(['type\\ script']);
    });
  });

  describe('a completion index is provided', () => {
    it('handle completion attempt of an empty argument', () => {
      expect(getArgs('cmd ', 4)).toEqual(['']);
    });

    it('handle completion attempt of a non-empty argument', () => {
      expect(getArgs('cmd type', 4)).toEqual(['']);
      expect(getArgs('cmd type', 6)).toEqual(['ty']);
      expect(getArgs('cmd "type script"', 10)).toEqual(['type ']);
    });

    it('handle completion attempt beyond the end of the line', () => {
      expect(getArgs('cmd', 4)).toEqual(['']);
      expect(getArgs('cmd ""', 7)).toEqual(['', '']);
      expect(getArgs('cmd type', 9)).toEqual(['type', '']);
    });
  });
});
