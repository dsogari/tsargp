import { afterAll, describe, expect, it, jest } from 'bun:test';
import { cs, fg, bg, tf } from '../lib/enums';
import {
  AnsiString,
  AnsiMessage,
  WarnMessage,
  ErrorMessage,
  TextMessage,
  ul,
  fg8,
  bg8,
  ul8,
  seq,
  style,
  cfg,
} from '../lib/styles';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('AnsiString', () => {
  describe('seq', () => {
    it('add text with control sequences', () => {
      const str = new AnsiString()
        .seq(seq(cs.rcp))
        .seq(seq(cs.cbt, 1))
        .seq(seq(cs.tbm, 1, 2))
        .seq(seq(cs.rm, 1, 2, 3));
      expect(str.count).toEqual(4);
      expect(str.lengths).toEqual([0, 0, 0, 0]);
      expect(str.strings).toEqual(['\x1b[u', '\x1b[1Z', '\x1b[1;2r', '\x1b[1;2;3l']);
    });
  });

  describe('word', () => {
    it('add words without control sequences', () => {
      const str = new AnsiString().word('type').word('script');
      expect(str.count).toEqual(2);
      expect(str.lengths).toEqual([4, 6]);
      expect(str.strings).toEqual(['type', 'script']);
    });
  });

  describe('pop', () => {
    it('remove the last internal string', () => {
      const str = new AnsiString().split('type script').pop();
      expect(str.count).toEqual(1);
      expect(str.lengths).toEqual([4]);
      expect(str.strings).toEqual(['type']);
    });

    it('remove all strings when the provided count is greater than the internal count', () => {
      const str = new AnsiString().split('type script').pop(3);
      expect(str.count).toEqual(0);
    });
  });

  describe('setStyle', () => {
    it('add a style to the next word and reset to the default style afterwards', () => {
      const str = new AnsiString();
      str.style = style(fg8(0), bg8(0), ul8(0));
      str.word('type');
      expect(str.count).toEqual(1);
      expect(str.lengths).toEqual([4]);
      expect(str.strings).toEqual(['\x1b[38;5;0;48;5;0;58;5;0m' + 'type' + '\x1b[0m']);
    });
  });

  describe('open', () => {
    it('add an opening delimiter to the next word', () => {
      const str = new AnsiString().open('[').open('"').word('type');
      expect(str.count).toEqual(1);
      expect(str.lengths).toEqual([6]);
      expect(str.strings).toEqual(['["type']);
    });

    it('avoid merging the previous word with the next word if the delimiter is empty', () => {
      const str = new AnsiString().word('type').open('').word('script');
      expect(str.count).toEqual(2);
      expect(str.lengths).toEqual([4, 6]);
      expect(str.strings).toEqual(['type', 'script']);
    });

    it('add an opening delimiter at a specific position', () => {
      const str = new AnsiString().open('"', 0).word('type').open('[', 0);
      expect(str.count).toEqual(1);
      expect(str.lengths).toEqual([6]);
      expect(str.strings).toEqual(['["type']);
    });
  });

  describe('other', () => {
    it('avoid changing internal state if the other string is empty', () => {
      const str1 = new AnsiString();
      str1.merge = true;
      const str2 = new AnsiString().word('[').other(str1).word('type');
      expect(str2.count).toEqual(2);
      expect(str2.lengths).toEqual([1, 4]);
      expect(str2.strings).toEqual(['[', 'type']);
    });

    it('add the internal strings from the other string and preserve its merge flag', () => {
      const str1 = new AnsiString().split('type script');
      str1.merge = true;
      const str2 = new AnsiString().other(str1).split(': is fun');
      expect(str2.count).toEqual(4);
      expect(str2.lengths).toEqual([4, 7, 2, 3]);
      expect(str2.strings).toEqual(['type', 'script:', 'is', 'fun']);
    });

    it('merge the endpoint strings if the merge flag is set in the self string', () => {
      const str1 = new AnsiString().split('type script');
      const str2 = new AnsiString().open('[').other(str1).close(']');
      expect(str2.count).toEqual(2);
      expect(str2.lengths).toEqual([5, 7]);
      expect(str2.strings).toEqual(['[type', 'script]']);
    });

    it('merge the endpoint strings if the merge flag is set in the other string', () => {
      const str1 = new AnsiString();
      str1.merge = true;
      str1.split('type script');
      const str2 = new AnsiString().word('[').other(str1);
      expect(str2.count).toEqual(2);
      expect(str2.lengths).toEqual([5, 6]);
      expect(str2.strings).toEqual(['[type', 'script']);
    });
  });

  describe('close', () => {
    it('add a closing delimiter when there are no internal strings', () => {
      const str = new AnsiString().close(']');
      expect(str.count).toEqual(1);
      expect(str.lengths).toEqual([1]);
      expect(str.strings).toEqual([']']);
    });

    it('add a closing delimiter to the last internal string', () => {
      const str = new AnsiString()
        .word('type')
        .seq(style(fg.default, bg.default, ul.curly))
        .close(']')
        .close('.');
      expect(str.count).toEqual(2);
      expect(str.lengths).toEqual([4, 2]);
      expect(str.strings).toEqual(['type', '\x1b[39;49;4;3m].']);
    });

    it('avoid merging with the next word if the delimiter is empty', () => {
      const str = new AnsiString().word('type').close('').word('script');
      expect(str.count).toEqual(2);
      expect(str.lengths).toEqual([4, 6]);
      expect(str.strings).toEqual(['type', 'script']);
    });
  });
  describe('split', () => {
    it('split text with emojis', () => {
      const str = new AnsiString().split(`⚠️ type script`);
      expect(str.count).toEqual(3);
      expect(str.lengths).toEqual([2, 4, 6]);
      expect(str.strings).toEqual(['⚠️', 'type', 'script']);
    });

    it('split text with style sequences', () => {
      const str = new AnsiString().split(`${style(tf.clear)}type script${style(tf.clear)}`);
      expect(str.count).toEqual(2);
      expect(str.lengths).toEqual([4, 6]);
      expect(str.strings).toEqual(['\x1b[0m' + 'type', 'script' + '\x1b[0m']);
    });

    it('split text with paragraphs', () => {
      const str = new AnsiString().split('type\nscript\n\nis\nfun');
      expect(str.count).toEqual(5);
      expect(str.lengths).toEqual([4, 6, 0, 2, 3]);
      expect(str.strings).toEqual(['type', 'script', '\n\n', 'is', 'fun']);
    });

    it('split text with list items', () => {
      const str = new AnsiString().split('type:\n- script\n1. is fun');
      expect(str.count).toEqual(8);
      expect(str.lengths).toEqual([5, 0, 1, 6, 0, 2, 2, 3]);
      expect(str.strings).toEqual(['type:', '\n', '-', 'script', '\n', '1.', 'is', 'fun']);
    });

    describe('using format specifiers', () => {
      it('insert text at the specifier location', () => {
        const format = jest.fn(function (this: AnsiString) {
          this.word('abc');
        });
        const str = new AnsiString().split('type' + '#0 script is #1' + 'fun', format);
        expect(str.count).toEqual(4);
        expect(str.lengths).toEqual([7, 6, 2, 6]);
        expect(str.strings).toEqual(['type' + 'abc', 'script', 'is', 'abc' + 'fun']);
        expect(format).toHaveBeenCalledTimes(2);
        expect(format).toHaveBeenCalledWith('#0');
        expect(format).toHaveBeenCalledWith('#1');
      });

      it('avoid adding a line break to the first list item', () => {
        const format = jest.fn(function (this: AnsiString) {
          this.split('- item\n* item\n1. item');
        });
        const str = new AnsiString().split('#0', format);
        expect(str.count).toEqual(8);
        expect(str.lengths).toEqual([1, 4, 0, 1, 4, 0, 2, 4]);
        expect(str.strings).toEqual(['-', 'item', '\n', '*', 'item', '\n', '1.', 'item']);
        expect(format).toHaveBeenCalledTimes(1);
        expect(format).toHaveBeenCalledWith('#0');
      });

      it('avoid merging the last word with the next word when not inserting text', () => {
        const format = jest.fn();
        const str = new AnsiString().word('type').split('#0#0', format).word('script');
        expect(str.count).toEqual(2);
        expect(str.lengths).toEqual([4, 6]);
        expect(str.strings).toEqual(['type', 'script']);
        expect(format).toHaveBeenCalledTimes(2);
        expect(format).toHaveBeenCalledWith('#0');
      });
    });
  });

  describe('wrap', () => {
    describe('no width is provided', () => {
      it('avoid wrapping', () => {
        const result: Array<string> = [];
        new AnsiString().split('abc def').wrap(result, 0, 0, false);
        expect(result).toEqual(['abc', ' def']);
      });

      it('preserve line breaks', () => {
        const result: Array<string> = [];
        new AnsiString().split('abc\n\ndef').wrap(result, 0, 0, false);
        expect(result).toEqual(['abc', '\n\n', 'def']);
      });

      it('preserve emojis', () => {
        const result: Array<string> = [];
        new AnsiString().split('⚠️ abc').wrap(result, 0, 0, false);
        expect(result).toEqual(['⚠️', ' abc']);
      });

      it('omit styles', () => {
        const result: Array<string> = [];
        new AnsiString()
          .seq(style(tf.clear))
          .split(`abc${style(tf.clear)} def`)
          .wrap(result, 0, 0, false);
        expect(result).toEqual(['abc', ' def']);
      });

      describe('the current column is not zero', () => {
        it('shorten the current line by removing previous strings', () => {
          const result = ['  '];
          new AnsiString().split('abc def').wrap(result, 2, 0, false);
          expect(result).toEqual(['abc', ' def']);
        });

        it('shorten the current line by resizing previous strings', () => {
          const result = ['   '];
          new AnsiString().split('abc def').wrap(result, 2, 0, false);
          expect(result).toEqual([' ', 'abc', ' def']);
        });

        it('avoid adjusting the current line if the string is empty', () => {
          const result = ['  '];
          new AnsiString().wrap(result, 2, 0, false);
          expect(result).toEqual(['  ']);
        });

        it('avoid adjusting the current line if the string starts with a line break', () => {
          const result = ['  '];
          new AnsiString().break().wrap(result, 2, 0, false);
          expect(result).toEqual(['  ', '\n']);
        });

        describe('emitting styles', () => {
          it('adjust the current line with a move sequence', () => {
            const result: Array<string> = [];
            new AnsiString().split('abc def').wrap(result, 2, 0, true);
            expect(result).toEqual([seq(cs.cha, 1), 'abc', ' def']);
          });
        });
      });

      describe('the starting column is not zero', () => {
        it('adjust the current line with indentation', () => {
          const result: Array<string> = [];
          new AnsiString(2).word('abc').wrap(result, 0, 0, false);
          expect(result).toEqual(['  ', 'abc']);
        });

        it('keep indentation in new lines', () => {
          const result: Array<string> = [];
          new AnsiString(2).split('abc\n\ndef').wrap(result, 0, 0, false);
          expect(result).toEqual(['  ', 'abc', '\n\n', '  ', 'def']);
        });

        it('avoid adjusting the current line if the string is empty', () => {
          const result: Array<string> = [];
          new AnsiString(2).wrap(result, 0, 0, false);
          expect(result).toEqual([]);
        });

        it('avoid adjusting the current line if the string starts with a line break', () => {
          const result: Array<string> = [];
          new AnsiString(2).break().wrap(result, 0, 0, false);
          expect(result).toEqual(['\n']);
        });

        it('avoid adjusting the current line if the current column is the starting column', () => {
          const result = ['  '];
          new AnsiString(2).split('abc def').wrap(result, 2, 0, false);
          expect(result).toEqual(['  ', 'abc', ' def']);
        });

        describe('emitting styles', () => {
          it('adjust the current line with a move sequence', () => {
            const result: Array<string> = [];
            new AnsiString(2).split('abc def').wrap(result, 0, 0, true);
            expect(result).toEqual([seq(cs.cha, 3), 'abc', ' def']);
          });

          it('keep indentation in new lines with a move sequence', () => {
            const result: Array<string> = [];
            new AnsiString(2).split('abc\n\ndef').wrap(result, 0, 0, true);
            expect(result).toEqual([seq(cs.cha, 3), 'abc', '\n\n', seq(cs.cha, 3), 'def']);
          });
        });
      });

      describe('emitting styles', () => {
        it('emit styles', () => {
          const result: Array<string> = [];
          new AnsiString()
            .seq(style(tf.clear))
            .split(`abc${style(tf.clear)} def`)
            .wrap(result, 0, 0, true);
          expect(result).toEqual([style(tf.clear), 'abc' + style(tf.clear), ' def']);
        });
      });
    });

    describe('a width is provided', () => {
      it('wrap', () => {
        const result: Array<string> = [];
        new AnsiString().split('abc largest').wrap(result, 0, 8, false);
        expect(result).toEqual(['abc', '\n', 'largest']);
      });

      it('preserve line breaks', () => {
        const result: Array<string> = [];
        new AnsiString().split('abc\n\nlargest').wrap(result, 0, 8, false);
        expect(result).toEqual(['abc', '\n\n', 'largest']);
      });

      it('preserve emojis', () => {
        const result: Array<string> = [];
        new AnsiString().split('⚠️ largest').wrap(result, 0, 8, false);
        expect(result).toEqual(['⚠️', '\n', 'largest']);
      });

      it('omit styles', () => {
        const result: Array<string> = [];
        new AnsiString()
          .seq(style(tf.clear))
          .split(`abc${style(tf.clear)} largest`)
          .wrap(result, 0, 8, false);
        expect(result).toEqual(['abc', '\n', 'largest']);
      });

      describe('the current column is not zero', () => {
        it('add a line break when the largest word does not fit', () => {
          const result: Array<string> = [];
          new AnsiString().split('abc largest').wrap(result, 2, 5, false);
          expect(result).toEqual(['\n', 'abc', '\n', 'largest']);
        });

        it('avoid adding a line break when the largest word does not fit, if the string starts with a line break', () => {
          const result: Array<string> = [];
          new AnsiString().break().split('abc largest').wrap(result, 2, 5, false);
          expect(result).toEqual(['\n', 'abc', '\n', 'largest']);
        });
      });

      describe('the starting column is not zero', () => {
        it('adjust the current line with indentation if the largest word fits', () => {
          const result: Array<string> = [];
          new AnsiString(1).split('abc largest').wrap(result, 0, 8, false);
          expect(result).toEqual([' ', 'abc', '\n ', 'largest']);
        });

        it('keep indentation in new lines if the largest word fits', () => {
          const result: Array<string> = [];
          new AnsiString(1).split('abc\n\nlargest').wrap(result, 0, 8, false);
          expect(result).toEqual([' ', 'abc', '\n\n', ' ', 'largest']);
        });

        it('keep indentation in wrapped lines if the largest word fits', () => {
          const result: Array<string> = [];
          new AnsiString(1).split('abc largest').wrap(result, 0, 8, false);
          expect(result).toEqual([' ', 'abc', '\n ', 'largest']);
        });

        it('avoid keeping indentation when the largest word does not fit', () => {
          const result: Array<string> = [];
          new AnsiString(1).split('abc largest').wrap(result, 0, 5, false);
          expect(result).toEqual(['abc', '\n', 'largest']);
        });

        describe('emitting styles', () => {
          it('keep indentation in wrapped lines with a move sequence', () => {
            const result: Array<string> = [];
            new AnsiString(1).split('abc largest').wrap(result, 0, 8, true);
            expect(result).toEqual([seq(cs.cha, 2), 'abc', `\n${seq(cs.cha, 2)}`, 'largest']);
          });
        });
      });

      describe('right-aligned', () => {
        it('align with spaces when breaking the line', () => {
          const result: Array<string> = [];
          new AnsiString(0, 0, true).word('abc').break().wrap(result, 0, 8, false);
          expect(result).toEqual(['     ', 'abc', '\n']);
        });

        it('align with spaces when wrapping the line', () => {
          const result: Array<string> = [];
          new AnsiString(0, 0, true).split('type script').wrap(result, 0, 8, false);
          expect(result).toEqual(['    ', 'type', '\n', '  ', 'script']);
        });

        describe('emitting styles', () => {
          it('align with a move sequence when breaking the line', () => {
            const result: Array<string> = [];
            new AnsiString(0, 0, true).word('abc').break().wrap(result, 0, 8, true);
            expect(result).toEqual([seq(cs.cuf, 5), 'abc', '\n']);
          });

          it('align with a move sequence when wrapping the line', () => {
            const result: Array<string> = [];
            new AnsiString(0, 0, true).split('type script').wrap(result, 0, 8, true);
            expect(result).toEqual([seq(cs.cuf, 4), 'type', '\n', seq(cs.cuf, 2), 'script']);
          });
        });
      });
    });
  });

  describe('format', () => {
    it('preserve a merge flag set before formatting', () => {
      const str1 = new AnsiString().split('type script');
      const str2 = new AnsiString().open('[').format(cfg, '#0', {}, str1);
      expect(str2.count).toEqual(2);
      expect(str2.strings).toEqual(['[type', 'script']);
    });

    it('preserve add closing word to a formatted generic value', () => {
      const str = new AnsiString().format(cfg, '#0', {}, () => 1).close('.');
      expect(str.count).toEqual(3);
      expect(str.strings).toEqual(['\x1b[90m' + '<()', '=>', '1>' + '\x1b[0m.']);
    });

    it('format single-valued arguments out of order', () => {
      const str = new AnsiString().format(
        cfg,
        '#9 #8 #7 #6 #5 #4 #3 #2 #1 #0',
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
      );
      expect(str.count).toEqual(20);
      expect(str.strings).toEqual([
        '\x1b[90m' + '<()',
        '=>',
        '1>' + '\x1b[0m',
        '{' + '\x1b[32m' + `'0'` + '\x1b[0m' + ':',
        '\x1b[32m' + `'c'` + '\x1b[0m' + ',',
        'a:',
        '\x1b[33m' + '1' + '\x1b[0m' + ',',
        '\x1b[32m' + `'d-'` + '\x1b[0m' + ':',
        '\x1b[31m' + '/ghi/i' + '\x1b[0m' + '}',
        '[' + '\x1b[33m' + '1' + '\x1b[0m' + ',',
        '\x1b[32m' + `'a'` + '\x1b[0m' + ',',
        '\x1b[34m' + 'false' + '\x1b[0m' + ']',
        'type',
        'script',
        '\x1b[36m' + 'https://abc/' + '\x1b[0m',
        '\x1b[35m' + 'some name' + '\x1b[0m',
        '\x1b[31m' + '/def/' + '\x1b[0m',
        '\x1b[33m' + '123' + '\x1b[0m',
        '\x1b[32m' + `'some text'` + '\x1b[0m',
        '\x1b[34m' + 'true' + '\x1b[0m',
      ]);
    });

    it('format array-valued arguments with custom separator', () => {
      const str1 = new AnsiString().split('type script');
      const str2 = new AnsiString().format(cfg, '#0', { sep: ';' }, [
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
      ]);
      expect(str2.count).toEqual(16);
      expect(str2.strings).toEqual([
        '[' + '\x1b[34m' + 'true' + '\x1b[0m' + ';',
        '\x1b[32m' + `'some text'` + '\x1b[0m' + ';',
        '\x1b[33m' + '123' + '\x1b[0m' + ';',
        '\x1b[31m' + '/def/g' + '\x1b[0m' + ';',
        '\x1b[35m' + 'some name' + '\x1b[0m' + ';',
        '\x1b[90m' + '<()',
        '=>',
        '1>' + '\x1b[0m' + ';',
        '{};',
        '\x1b[90m' + '<null>' + '\x1b[0m' + ';',
        '\x1b[90m' + '<undefined>' + '\x1b[0m' + ';',
        '\x1b[36m' + 'https://abc/' + '\x1b[0m' + ';',
        'type',
        'script;',
        'type',
        'script]',
      ]);
    });

    it('format object-valued arguments without merging the separator', () => {
      const str = new AnsiString().format(
        cfg,
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
        },
      );
      expect(str.count).toEqual(43);
      expect(str.strings).toEqual([
        '{b:',
        '\x1b[34m' + 'true' + '\x1b[0m',
        ',',
        's:',
        '\x1b[32m' + `'some text'` + '\x1b[0m',
        ',',
        'n:',
        '\x1b[33m' + '123' + '\x1b[0m',
        ',',
        'r:',
        '\x1b[31m' + '/def/' + '\x1b[0m',
        ',',
        'm:',
        '\x1b[35m' + 'some name' + '\x1b[0m',
        ',',
        'u:',
        '\x1b[36m' + 'https://abc/' + '\x1b[0m',
        ',',
        't:',
        'type',
        'script',
        ',',
        'a:',
        '[' + '\x1b[33m' + '1' + '\x1b[0m',
        ',',
        '\x1b[32m' + `'a'` + '\x1b[0m',
        ',',
        '\x1b[34m' + 'false' + '\x1b[0m' + ']',
        ',',
        'o:',
        '{' + '\x1b[32m' + `'0'` + '\x1b[0m' + ':',
        '\x1b[32m' + `'c'` + '\x1b[0m',
        ',',
        'a:',
        '\x1b[33m' + '1' + '\x1b[0m',
        ',',
        '\x1b[32m' + `'d-'` + '\x1b[0m' + ':',
        '\x1b[31m' + '/ghi/i' + '\x1b[0m' + '}',
        ',',
        'v:',
        '\x1b[90m' + '<()',
        '=>',
        '1>' + '\x1b[0m' + '}',
      ]);
    });
  });
});

describe('AnsiMessage', () => {
  afterAll(() => {
    ['NO_COLOR', 'FORCE_COLOR'].forEach((key) => delete process.env[key]);
  });

  it('wrap the message to the specified width, while respecting the environment configuration', () => {
    const str = new AnsiString().split('type script');
    const msg = new AnsiMessage(str);
    expect(msg.wrap(0)).toEqual('type script');
    expect(msg.wrap(11)).toEqual('type script' + style(tf.clear));
    process.env['NO_COLOR'] = '1';
    expect(msg.wrap(0)).toEqual('type script');
    expect(msg.wrap(11)).toEqual('type script');
    process.env['FORCE_COLOR'] = '1';
    expect(msg.wrap(0)).toEqual('type script' + style(tf.clear));
    expect(msg.wrap(11)).toEqual('type script' + style(tf.clear));
  });

  it('be able to be thrown and caught, while producing a string message', () => {
    const str = new AnsiString().split('type script');
    expect(() => {
      throw new AnsiMessage(str);
    }).toThrow('type script');
  });
});

describe('WarnMessage', () => {
  it('be able to be thrown and caught, while producing a string message', () => {
    const str = new AnsiString().split('type script');
    expect(() => {
      throw new WarnMessage(str);
    }).toThrow('type script');
  });
});

describe('ErrorMessage', () => {
  it('avoid prefixing the message with "Error:" when converting to string', () => {
    const str = new AnsiString().split('type script');
    const msg = new ErrorMessage(str);
    expect(`${msg}`).toEqual('type script');
  });

  it('be able to be thrown and caught, while producing a string message', () => {
    const str = new AnsiString().split('type script');
    expect(() => {
      throw new ErrorMessage(str);
    }).toThrow('type script');
  });
});

describe('TextMessage', () => {
  it('be able to be thrown and caught, while producing a string message', () => {
    expect(() => {
      throw new TextMessage('type', 'script');
    }).toThrow('type\nscript');
  });
});
