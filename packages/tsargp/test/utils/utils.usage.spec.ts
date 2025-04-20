import { describe, expect, it } from 'bun:test';
import { createUsage, stronglyConnected } from '../../src/library/utils';

describe('stronglyConnected and createUsage', () => {
  it('create a usage statement for mutually dependent options', () => {
    const dependencies = {
      a: ['b', 'c'],
      b: ['a', 'c', 'd'], // test duplicate removal
      c: ['d', 'e'],
      d: ['c'],
      x: ['y', 'c'],
      y: ['x', 'z'],
    };
    const [byKey, byComp, compAdj] = stronglyConnected(dependencies);
    expect(byKey).toEqual({ a: 'a', b: 'a', c: 'c', d: 'c', e: 'e', x: 'x', y: 'x', z: 'z' });
    expect(byComp).toEqual({ a: ['a', 'b'], c: ['c', 'd'], e: ['e'], x: ['x', 'y'], z: ['z'] });
    expect(compAdj).toEqual({ a: ['c'], c: ['e'], e: [], x: ['c', 'z'], z: [] });
    const usage = createUsage(compAdj);
    expect(usage).toEqual([['e', ['c', ['a']], ['c', 'z', ['x']]], ['z']]);
  });

  it('create a usage statement for transitively dependent options', () => {
    const dependencies = {
      a: ['d', 'e', 'k'], // test direct dependency together with transitive
      b: ['f', 'j'],
      c: ['g', 'k'],
      d: ['g', 'h'],
      e: ['i', 'j'],
      f: ['i', 'j'],
      g: ['k'],
    };
    const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
    const [byKey, byComp, compAdj] = stronglyConnected(dependencies);
    expect(byKey).toEqual(Object.assign({}, ...keys.map((key) => ({ [key]: key }))));
    expect(byComp).toEqual(Object.assign({}, ...keys.map((key) => ({ [key]: [key] }))));
    expect(compAdj).toEqual({
      a: ['d', 'e', 'k'],
      b: ['f', 'j'],
      c: ['g', 'k'],
      d: ['g', 'h'],
      e: ['i', 'j'],
      f: ['i', 'j'],
      g: ['k'],
      h: [],
      i: [],
      j: [],
      k: [],
    });
    const usage = createUsage(compAdj);
    expect(usage).toEqual([
      ['k', ['g', ['c']], ['g', 'h', ['d']], ['g', 'h', 'i', 'j', ['d', 'e', ['a']]]],
      ['h'],
      ['i'],
      ['j'],
      ['i', 'j', ['e'], ['f', ['b']]],
    ]);
  });
});
