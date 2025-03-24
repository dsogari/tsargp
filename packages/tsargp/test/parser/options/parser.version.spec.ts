import { describe, expect, it } from 'bun:test';
import type { Options } from '../../../src/library';
import { parse } from '../../../src/library';

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
      expect(parse(options, ['-v'])).resolves.toEqual({
        version: expect.objectContaining({ message: '0.1.0' }),
      });
    });

    it('throw a version message without version info', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
        },
      } as const satisfies Options;
      expect(parse(options, [])).resolves.not.toHaveProperty('version');
      expect(parse(options, ['-v'])).rejects.toThrow(/^$/);
    });

    it('throw a version message with semantic version', () => {
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

    it('throw a version message from a version module', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          versionModule: import.meta.resolve('../../data/with-version.json'),
        },
      } as const satisfies Options;
      expect(parse(options, ['-v'])).rejects.toThrow(/^0.0.0$/);
    });

    it('throw an empty message when a version module does not contain a version field', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          versionModule: import.meta.resolve('../../data/empty.json'),
        },
      } as const satisfies Options;
      expect(parse(options, ['-v'])).rejects.toThrow(/^$/);
    });

    it('throw an empty message when a version module is not valid JSON', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          versionModule: import.meta.resolve('../../data/invalid.jsonc'),
        },
      } as const satisfies Options;
      expect(parse(options, ['-v'])).rejects.toThrow(/^$/);
    });

    it('throw an error when a version module cannot be found', () => {
      const options = {
        version: {
          type: 'version',
          names: ['-v'],
          versionModule: import.meta.resolve('../../data/absent.json'),
        },
      } as const satisfies Options;
      expect(parse(options, ['-v'])).rejects.toThrow(
        `Cannot find module ${options.version.versionModule.replace('file://', "'")}`,
      );
    });
  });
});
