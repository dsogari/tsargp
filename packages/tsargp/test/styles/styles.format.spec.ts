import { describe, expect, it } from 'bun:test';
import { ansi, AnsiString, config, fg, style, tf } from '../../src/library';
import { arrayWithPhrase } from '../../src/library/utils';

describe('AnsiString', () => {
  describe('format', () => {
    it('preserve a merge flag set before formatting', () => {
      const str1 = new AnsiString().split('type script');
      const str2 = new AnsiString().open('[').format('#0', {}, str1);
      expect(str2.strings).toEqual(['[type', 'script']);
    });

    it('add closing word to a formatted generic value', () => {
      const str = new AnsiString().format('#0', {}, () => 1).close('.');
      expect(str.strings).toEqual(['<()', '=>', '1>.']);
    });

    it('repeat the formatted value', () => {
      const str = new AnsiString().format('#0 #0', {}, undefined);
      expect(str.strings).toEqual(['<undefined>', '<undefined>']);
    });

    it('apply a phrase to each array element', () => {
      const str = new AnsiString().format('#0', {}, arrayWithPhrase('<#0>', [1, 'a', true]));
      expect(str.strings).toEqual(['[<1>,', "<'a'>,", '<true>]']);
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
      expect(str.strings).toEqual([
        '<undefined>',
        '<()',
        '=>',
        '1>',
        `{'0':`,
        `'c',`,
        'a:',
        '1,',
        `'d-':`,
        '/ghi/i}',
        '[1,',
        `'a',`,
        'false]',
        'type',
        'script',
        'https://abc/',
        'some name',
        '/def/',
        '123',
        `'some text'`,
        'true',
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
        str1,
        undefined,
      ]);
      expect(str2.strings).toEqual([
        '[true;',
        `'some text';`,
        '123;',
        '/def/g;',
        'some name;',
        '<()',
        '=>',
        '1>;',
        '{};',
        '<null>;',
        '<undefined>;',
        'https://abc/;',
        'type',
        'script;',
        'type',
        'script;',
        '<undefined>]',
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
      expect(str.strings).toEqual([
        '{b:',
        'true',
        ',',
        's:',
        `'some text'`,
        ',',
        'n:',
        '123',
        ',',
        'r:',
        '/def/',
        ',',
        'm:',
        'some name',
        ',',
        'u:',
        'https://abc/',
        ',',
        't:',
        'type',
        'script',
        ',',
        'a:',
        '[1',
        ',',
        `'a'`,
        ',',
        'false]',
        ',',
        'o:',
        `{'0':`,
        `'c'`,
        ',',
        'a:',
        '1',
        ',',
        `'d-':`,
        '/ghi/i}',
        ',',
        'v:',
        '<()',
        '=>',
        '1>',
        ',',
        'v2:',
        '<undefined>}',
      ]);
    });

    it('format a string created from a tagged template literal with arguments', () => {
      const clr = style(tf.clear);
      const noColor = style(fg.default);
      const symbol = Symbol.for('fun');
      const url = new URL('https://abc');
      const object = { $cmd: [1] };
      const str = ansi`${clr} type ${clr} ${true} ${'script'} ${123} ${/is/} ${symbol} ${undefined} ${url} ${object}`;
      expect(str.strings).toEqual([
        'type',
        'true',
        "'script'",
        '123',
        '/is/',
        'fun',
        '<undefined>',
        'https://abc/',
        "{'$cmd':",
        '[1]}',
      ]);
      expect(str.styled).toEqual([
        clr + 'type' + clr,
        config.styles.boolean + 'true' + noColor,
        config.styles.string + "'script'" + noColor,
        config.styles.number + '123' + noColor,
        config.styles.regex + '/is/' + noColor,
        config.styles.symbol + 'fun' + noColor,
        config.styles.value + '<undefined>' + noColor,
        config.styles.url + 'https://abc/' + noColor,
        '{' + config.styles.string + "'$cmd'" + noColor + ':',
        '[' + config.styles.number + '1' + noColor + ']}',
      ]);
    });
  });
});
