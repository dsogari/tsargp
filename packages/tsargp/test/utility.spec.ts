import { describe, expect, it } from 'bun:test';
import type { Options } from '../src/library';
import { parse } from '../src/library';
import { numberInRange, sectionFooter } from '../src/utility';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('parse', () => {
  describe('numberInRange', () => {
    it('ignore an error thrown during completion', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          parse: numberInRange([1, Infinity], '#0 #1 #2.'),
        },
      } as const satisfies Options;
      expect(parse(options, 'cmd -s 0 ', { compIndex: 9 })).rejects.toThrow(/^-s$/);
    });

    it('handle a single-valued option with a parsing callback that throws', () => {
      const options = {
        single: {
          type: 'single',
          names: ['-s'],
          parse: numberInRange([1, Infinity], '#0 #1 #2.'),
        },
      } as const satisfies Options;
      expect(parse(options, ['-s', '123'])).resolves.toEqual({ single: 123 });
      expect(parse(options, ['-s', '0'])).rejects.toThrow(`-s '0' [1, Infinity]`);
      expect(parse(options, ['-s', 'a'])).rejects.toThrow(`-s 'a' [1, Infinity]`);
    });

    it('handle an array-valued option with a parsing callback that throws', () => {
      const options = {
        array: {
          type: 'array',
          names: ['-a'],
          parse: numberInRange([1, Infinity], '#0 #1 #2.'),
        },
      } as const satisfies Options;
      expect(parse(options, ['-a', '123'])).resolves.toEqual({ array: [123] });
      expect(parse(options, ['-a', '0'])).rejects.toThrow(`-a '0' [1, Infinity]`);
      expect(parse(options, ['-a', 'a'])).rejects.toThrow(`-a 'a' [1, Infinity]`);
    });
  });

  describe('sectionFooter', () => {
    describe('when a repository URL cannot be found in the package.json file', () => {
      it('return undefined when the file cannot be found', () => {
        const url = new URL(import.meta.resolve('./data/absent.json'));
        expect(sectionFooter(url, '')).resolves.toBeUndefined();
      });

      it('throw an error when the file is not valid JSON', () => {
        const url = new URL(import.meta.resolve('./data/invalid.jsonc'));
        expect(sectionFooter(url, '')).rejects.toThrow('JSON Parse error');
      });

      it('return undefined when the file does not contain a repository field', () => {
        const url = new URL(import.meta.resolve('./data/empty.json'));
        expect(sectionFooter(url, '')).resolves.toBeUndefined();
      });
    });

    describe('when a repository URL is found in the package.json file', () => {
      it('return a text when the file contains a repository field with a URL string', () => {
        const url = new URL(import.meta.resolve('./data/with-repository.json'));
        expect(sectionFooter(url)).resolves.toEqual(
          '\x1b[36m' + 'https://github.com/dsogari/tsargp' + '\x1b[39m',
        );
      });

      it('return a text with a suffix when the file contains a repository field', () => {
        const url = new URL(import.meta.resolve('./data/with-repository.json'));
        expect(sectionFooter(url, '#0', '/issues')).resolves.toEqual(
          '\x1b[36m' + 'https://github.com/dsogari/tsargp/issues' + '\x1b[39m',
        );
      });

      it('return a text when the file contains a repository field with a url field', () => {
        const url = new URL(import.meta.resolve('./data/with-repository-url.json'));
        expect(sectionFooter(url)).resolves.toEqual(
          '\x1b[36m' + 'https://github.com/dsogari/tsargp' + '\x1b[39m',
        );
      });

      it('return a text when the file contains a repository field with a GitHub host', () => {
        const url = new URL(import.meta.resolve('./data/with-repository-github.json'));
        expect(sectionFooter(url)).resolves.toEqual(
          '\x1b[36m' + 'https://github.com/dsogari/tsargp' + '\x1b[39m',
        );
      });

      it('return a text when the file contains a repository field with a default host', () => {
        const url = new URL(import.meta.resolve('./data/with-repository-default.json'));
        expect(sectionFooter(url)).resolves.toEqual(
          '\x1b[36m' + 'https://github.com/dsogari/tsargp' + '\x1b[39m',
        );
      });
    });
  });
});
