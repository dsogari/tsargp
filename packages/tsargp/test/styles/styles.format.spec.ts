import { describe, expect, it } from 'bun:test';
import { ansi, AnsiString, config } from '../../src/library';
import { arrayWithPhrase } from '../../src/library/utils';
import { rs } from '../../src/library/enums';

const noColor = [rs.defaultForeground];

describe('AnsiString', () => {
  describe('format', () => {
    it('preserve a merge flag set before formatting', () => {
      const str1 = new AnsiString().split('type script');
      const str2 = new AnsiString().open('[').format('#0', {}, str1);
      expect(str2.words).toEqual([['[', 'type'], ['script']]);
    });

    it('add closing word to a formatted generic value', () => {
      const str = new AnsiString().format('#0', {}, () => 1).close('.');
      expect(str.words).toEqual([
        [config.styles.value, '<', '()'],
        ['=>'],
        ['1', '>', noColor, '.'],
      ]);
    });

    it('repeat the formatted value', () => {
      const str = new AnsiString().format('#0 #0', {}, undefined);
      expect(str.words).toEqual([
        [config.styles.value, '<', 'undefined', '>', noColor],
        [config.styles.value, '<', 'undefined', '>', noColor],
      ]);
    });

    it('apply a phrase to each array element', () => {
      const str = new AnsiString().format('#0', {}, arrayWithPhrase('<#0>', [1, 'a', true]));
      expect(str.words).toEqual([
        ['[', '<', config.styles.number, '1', noColor, '>', ','],
        ['<', config.styles.string, "'a'", noColor, '>', ','],
        ['<', config.styles.boolean, 'true', noColor, '>', ']'],
      ]);
    });

    it('format single-valued arguments out of order', () => {
      const str = new AnsiString().format(
        '#10 #9 #8 #7 #6 #5 #4 #3 #2 #1 #0',
        {},
        true,
        'some text',
        123,
        /def/,
        Symbol.for('some name'),
        new URL('https://abc'),
        new AnsiString().split('type script'),
        [1, 'a', false],
        { a: 1, 0: 'c', 'd-': /ghi/i },
        () => 1,
        undefined,
      );
      expect(str.words).toEqual([
        [config.styles.value, '<', 'undefined', '>', noColor],
        [config.styles.value, '<', '()'],
        ['=>'],
        ['1', '>', noColor],
        ['{', config.styles.string, `'0'`, noColor, ':'],
        [config.styles.string, `'c'`, noColor, ','],
        [config.styles.symbol, 'a', noColor, ':'],
        [config.styles.number, '1', noColor, ','],
        [config.styles.string, `'d-'`, noColor, ':'],
        [config.styles.regex, '/ghi/i', noColor, '}'],
        ['[', config.styles.number, '1', noColor, ','],
        [config.styles.string, `'a'`, noColor, ','],
        [config.styles.boolean, 'false', noColor, ']'],
        ['type'],
        ['script'],
        [config.styles.url, 'https://abc/', noColor],
        [config.styles.symbol, 'some name', noColor],
        [config.styles.regex, '/def/', noColor],
        [config.styles.number, '123', noColor],
        [config.styles.string, `'some text'`, noColor],
        [config.styles.boolean, 'true', noColor],
      ]);
    });

    it('format array-valued arguments with custom separator', () => {
      const str1 = new AnsiString().split('type script');
      const str2 = new AnsiString().format('#0', { sep: ';' }, [
        true,
        'some text',
        123,
        /def/g,
        Symbol.for('some name'),
        () => 1,
        {},
        null,
        undefined,
        new URL('https://abc'),
        str1,
        str1, // spliced
      ]);
      expect(str2.words).toEqual([
        ['[', config.styles.boolean, 'true', noColor, ';'],
        [config.styles.string, `'some text'`, noColor, ';'],
        [config.styles.number, '123', noColor, ';'],
        [config.styles.regex, '/def/g', noColor, ';'],
        [config.styles.symbol, 'some name', noColor, ';'],
        [config.styles.value, '<', '()'],
        ['=>'],
        ['1', '>', noColor, ';'],
        ['{', '}', ';'],
        [config.styles.value, '<', 'null', '>', noColor, ';'],
        [config.styles.value, '<', 'undefined', '>', noColor, ';'],
        [config.styles.url, 'https://abc/', noColor, ';'],
        ['type'],
        ['script', ';'],
        ['type'],
        ['script', ']'],
      ]);
    });

    it('format object-valued arguments without merging the separator', () => {
      const str = new AnsiString().format(
        '#0',
        { mergePrev: false },
        {
          b: true,
          s: 'some text',
          n: 123,
          r: /def/,
          m: Symbol.for('some name'),
          u: new URL('https://abc'),
          t: new AnsiString().split('type script'),
          a: [1, 'a', false],
          o: { a: 1, 0: 'c', 'd-': /ghi/i },
          v: () => 1,
          v2: undefined,
        },
      );
      expect(str.words).toEqual([
        ['{', config.styles.symbol, 'b', noColor, ':'],
        [config.styles.boolean, 'true', noColor],
        [','],
        [config.styles.symbol, 's', noColor, ':'],
        [config.styles.string, `'some text'`, noColor],
        [','],
        [config.styles.symbol, 'n', noColor, ':'],
        [config.styles.number, '123', noColor],
        [','],
        [config.styles.symbol, 'r', noColor, ':'],
        [config.styles.regex, '/def/', noColor],
        [','],
        [config.styles.symbol, 'm', noColor, ':'],
        [config.styles.symbol, 'some name', noColor],
        [','],
        [config.styles.symbol, 'u', noColor, ':'],
        [config.styles.url, 'https://abc/', noColor],
        [','],
        [config.styles.symbol, 't', noColor, ':'],
        ['type'],
        ['script'],
        [','],
        [config.styles.symbol, 'a', noColor, ':'],
        ['[', config.styles.number, '1', noColor],
        [','],
        [config.styles.string, `'a'`, noColor],
        [','],
        [config.styles.boolean, 'false', noColor, ']'],
        [','],
        [config.styles.symbol, 'o', noColor, ':'],
        ['{', config.styles.string, `'0'`, noColor, ':'],
        [config.styles.string, `'c'`, noColor],
        [','],
        [config.styles.symbol, 'a', noColor, ':'],
        [config.styles.number, '1', noColor],
        [','],
        [config.styles.string, `'d-'`, noColor, ':'],
        [config.styles.regex, '/ghi/i', noColor, '}'],
        [','],
        [config.styles.symbol, 'v', noColor, ':'],
        [config.styles.value, '<', '()'],
        ['=>'],
        ['1', '>', noColor],
        [','],
        [config.styles.symbol, 'v2', noColor, ':'],
        [config.styles.value, '<', 'undefined', '>', noColor, '}'],
      ]);
    });

    it('format a string created from a tagged template literal with arguments', () => {
      const symbol = Symbol.for('fun');
      const url = new URL('https://abc');
      const object = { $cmd: [1] };
      const str = ansi`\x1b[1m type ${true} ${'script'} ${123} ${/is/} ${symbol} ${undefined} ${url} ${object}`;
      expect(str.words).toEqual([
        ['type'],
        [config.styles.boolean, 'true', noColor],
        [config.styles.string, "'script'", noColor],
        [config.styles.number, '123', noColor],
        [config.styles.regex, '/is/', noColor],
        [config.styles.symbol, 'fun', noColor],
        [config.styles.value, '<', 'undefined', '>', noColor],
        [config.styles.url, 'https://abc/', noColor],
        ['{', config.styles.string, "'$cmd'", noColor, ':'],
        ['[', config.styles.number, '1', noColor, ']', '}'],
      ]);
    });
  });
});
