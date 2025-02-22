import { describe, expect, it } from 'bun:test';
import { type Options, OptionRegistry, valuesFor } from '../lib/options';

describe('OptionRegistry', () => {
  describe('constructor', () => {
    it('handle zero options', () => {
      expect(() => new OptionRegistry({})).not.toThrow();
    });

    describe('registering option names', () => {
      it('ignore null values', () => {
        const options = {
          flag: {
            type: 'flag',
            names: [null, '-f'],
          },
          single: {
            type: 'single',
            positional: true,
          },
        } as const satisfies Options;
        const registry = new OptionRegistry(options);
        expect(registry.names).toHaveLength(1);
        expect(registry.names.get('-f')).toEqual('flag');
        expect(options.flag).toHaveProperty('preferredName', '-f');
        expect(options.single).toHaveProperty('preferredName', undefined);
      });

      it('include the positional marker', () => {
        const options = {
          single: {
            type: 'single',
            positional: 'marker',
          },
        } as const satisfies Options;
        const registry = new OptionRegistry(options);
        expect(registry.names).toHaveLength(1);
        expect(registry.names.get('marker')).toEqual('single');
        expect(options.single).toHaveProperty('preferredName', 'marker');
        expect(registry.positional).toEqual(['single', options.single, 'marker']);
      });
    });

    describe('registering cluster letters', () => {
      it('register each letter', () => {
        const options = {
          flag: {
            type: 'flag',
            cluster: 'fF',
          },
        } as const satisfies Options;
        const registry = new OptionRegistry(options);
        expect(registry.letters).toHaveLength(2);
        expect(registry.letters.get('f')).toEqual('flag');
        expect(registry.letters.get('F')).toEqual('flag');
      });
    });
  });
});

describe('valuesFor', () => {
  it('return an empty object', () => {
    expect(valuesFor({})).toEqual({});
  });
});
