import { describe, expect, it } from 'bun:test';
import { areEqual } from '../../src/library/utils';

describe('areEqual', () => {
  describe('comparing primitive values', () => {
    it('return true on both values equal', () => {
      expect(areEqual(true, true)).toBeTruthy();
      expect(areEqual('abc', 'abc')).toBeTruthy();
      expect(areEqual(123, 123)).toBeTruthy();
    });

    it('return false on values different', () => {
      expect(areEqual(true, false)).toBeFalsy();
      expect(areEqual(false, true)).toBeFalsy();
      expect(areEqual('abc', 'def')).toBeFalsy();
      expect(areEqual(123, 456)).toBeFalsy();
    });
  });

  describe('comparing arrays', () => {
    it('return true on both arrays equal', () => {
      expect(areEqual([], [])).toBeTruthy();
      expect(areEqual([1, 2, 3], [1, 2, 3])).toBeTruthy();
    });

    it('return false on arrays with different lengths', () => {
      expect(areEqual([1, 2], [1, 2, 3])).toBeFalsy();
    });

    it('return false on arrays with values in different order', () => {
      expect(areEqual([1, 2, 3], [3, 2, 1])).toBeFalsy();
    });

    it('return false on arrays with different values', () => {
      expect(areEqual([1, 2], [1])).toBeFalsy();
      expect(areEqual([1], [1, 3])).toBeFalsy();
    });
  });

  describe('comparing objects', () => {
    it('return true on both objects equal', () => {
      expect(areEqual(null, null)).toBeTruthy();
      expect(areEqual({}, {})).toBeTruthy();
      expect(areEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBeTruthy();
    });

    it('return false on objects with different keys', () => {
      expect(areEqual({ a: 1 }, {})).toBeFalsy();
      expect(areEqual({ a: 1 }, { b: 1 })).toBeFalsy();
    });

    it('return false on objects with different values', () => {
      expect(areEqual({ a: 1 }, { a: 2 })).toBeFalsy();
    });

    it('return false on object vs null', () => {
      expect(areEqual(null, {})).toBeFalsy();
      expect(areEqual({}, null)).toBeFalsy();
    });
  });

  describe('comparing other types of values', () => {
    it('return true on same reference', () => {
      expect(areEqual(expect, expect)).toBeTruthy();
    });

    it('return false on different functions', () => {
      expect(
        areEqual(
          () => {},
          () => {},
        ),
      ).toBeFalsy();
    });

    it('return true on deeply equal complex values', () => {
      expect(areEqual([1, { a: ['b', 2] }], [1, { a: ['b', 2] }])).toBeTruthy();
      expect(areEqual({ a: ['b', { c: 1 }] }, { a: ['b', { c: 1 }] })).toBeTruthy();
    });
  });
});
