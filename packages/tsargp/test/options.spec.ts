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
            names: ['-f', null],
          },
        } as const satisfies Options;
        const registry = new OptionRegistry(options);
        expect(registry.names).toHaveLength(1);
        expect(registry.names.get('-f')).toEqual('flag');
        expect(options.flag).toHaveProperty('preferredName', '-f');
      });

      it('include the positional marker', () => {
        const options = {
          single: {
            type: 'single',
            positional: '',
            preferredName: 'preferred',
          },
        } as const satisfies Options;
        const registry = new OptionRegistry(options);
        expect(registry.names).toHaveLength(1);
        expect(registry.names.get('')).toEqual('single');
        expect(registry.positional).toEqual(['single', options.single, 'preferred']);
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
