import { describe, expect, it } from 'bun:test';
import { type Options } from '../../../src/options';
import { parse } from '../../../src/parser';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('parsing a version option', () => {
    it('save the version message when the option explicitly asks so', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          version: '0.1.0',
          saveMessage: true,
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.toEqual({ version: undefined });
      expect(parse(options, ['-v'])).resolves.toEqual({ version: '0.1.0' });
    });

    it('throw a version message with fixed version', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          version: '0.1.0',
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.not.toHaveProperty('version');
      expect(parse(options, ['-v'])).rejects.toThrow(/^0.1.0$/);
    });

    it('throw a version message from a version file', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          version: new URL(import.meta.resolve('../../data/with-version.json')),
        },
      } as const satisfies Options;
      expect(parse(options, ['-v'])).rejects.toThrow(/^0.0.0$/);
    });

    it('throw a version message from a file that does not contain a version field', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          version: new URL(import.meta.resolve('../../data/no-version.json')),
        },
      } as const satisfies Options;
      expect(parse(options, ['-v'])).rejects.toThrow(/^undefined$/);
    });

    it('throw an error when a version file is not valid JSON', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          version: new URL(import.meta.resolve('../../data/invalid.jsonc')),
        },
      } as const satisfies Options;
      expect(parse(options, ['-v'])).rejects.toThrow(`JSON Parse error`);
    });

    it('throw an error when a version file cannot be found', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          version: new URL(import.meta.resolve('../../data/absent.json')),
        },
      } as const satisfies Options;
      expect(parse(options, ['-v'])).rejects.toThrow(`Could not find a version JSON file.`);
    });
  });
});
