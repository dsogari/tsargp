import { describe, expect, it } from 'bun:test';
import {
  findValue,
  readFile,
  makeUnique,
  setUnion,
  setDifference,
  handleError,
} from '../../src/library/utils';

describe('findValue', () => {
  it('return undefined on no match', () => {
    expect(findValue({}, () => true)).toBeUndefined();
    expect(findValue({ a: 1, b: 'a' }, () => false)).toBeUndefined();
  });

  it('return the first match', () => {
    expect(findValue({ a: 1, b: 'a' }, () => true)).toEqual(1);
    expect(findValue({ a: 1, b: 'a' }, (val) => val === 'a')).toEqual('a');
  });
});

describe('readFile', () => {
  it('throw an error when trying to read from invalid file descriptor', () => {
    expect(readFile(-1)).rejects.toThrow('out of range');
  });

  it.skip('block when trying to read from an interactive terminal', () => {
    process.stdin.isTTY = true;
    expect(readFile(0)).resolves.toBeUndefined();
  });

  it('return undefined when there is no data to read', () => {
    expect(readFile('')).resolves.toBeUndefined();
    expect(readFile('a')).resolves.toBeUndefined();
  });

  it('return data read from a local file', () => {
    const url = new URL(import.meta.resolve('../data/test-read-file.txt'));
    expect(readFile(url)).resolves.toMatch(/^test\r?\nread\r?\nfile$/);
  });
});

describe('makeUnique', () => {
  it('remove duplicates while preserving order', () => {
    expect(makeUnique([2, 3, 2, 1, 3, 1])).toEqual([2, 3, 1]);
  });
});

describe('setUnion', () => {
  it('add elements while preserving order', () => {
    const set = setUnion(new Set([2, 3]), new Set([1, 3]));
    expect([...set]).toEqual([2, 3, 1]);
  });
});

describe('setDifference', () => {
  it('remove elements while preserving order', () => {
    const set = setDifference(new Set([2, 3, 4]), new Set([1, 3]));
    expect([...set]).toEqual([2, 4]);
  });
});

describe('handleError', () => {
  it('throw an instance of Error', () => {
    expect(() => handleError(Error('abc'))).toThrow(/^abc$/);
  });
});
