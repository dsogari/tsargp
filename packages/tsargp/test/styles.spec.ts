import { afterEach, describe, expect, it, jest } from 'bun:test';
import {
  cs,
  fg,
  bg,
  tf,
  ul,
  ErrorItem,
  AnsiString,
  AnsiMessage,
  WarnMessage,
  ErrorMessage,
  TextMessage,
  ext8,
  rgb,
  seq,
  style,
} from '../src/library';

const clr = style(tf.clear);
const bold = style(tf.bold);

describe('AnsiString', () => {
  describe('add', () => {
    it('add sequences', () => {
      const str = new AnsiString()
        .add('', '' + seq(cs.rcp))
        .add('', '' + seq(cs.cbt, 1))
        .add('', '' + seq(cs.tbm, 1, 2))
        .add('', '' + seq(cs.rm, 1, 2, 3));
      expect(str.count).toEqual(0);
      expect(str.strings).toBeEmpty();
      expect(str.styled).toBeEmpty();
    });
  });

  describe('break', () => {
    it('add line feeds', () => {
      const str = new AnsiString().break(2).break();
      expect(str.strings).toEqual(['', '']);
      expect(str.styled).toEqual(['\n\n', '\n']);
    });
  });

  describe('word', () => {
    it('add words with no style', () => {
      const str = new AnsiString().word('type').word('script');
      expect(str.strings).toEqual(['type', 'script']);
      expect(str.styled).toEqual(['type', 'script']);
    });

    it('add a word with style and reset the style', () => {
      const sty = style(fg.extended, ext8(0), bg.extended, ext8(0), ul.extended, rgb(0, 0, 0));
      const rst = style(fg.default, bg.default, ul.default);
      const str = new AnsiString().word('type', sty);
      expect(str.strings).toEqual(['type']);
      expect(str.styled).toEqual([sty + 'type' + rst]);
    });
  });

  describe('clear', () => {
    it('remove all strings', () => {
      const str = new AnsiString().word('type').word('script').clear();
      expect(str.count).toEqual(0);
      expect(str.strings).toBeEmpty();
      expect(str.styled).toBeEmpty();
      expect(str.maxLength).toEqual(0);
    });

    it('clear the styles', () => {
      const str = new AnsiString().pushSty(bold).word('type').clear().popSty().word('script');
      expect(str.strings).toEqual(['script']);
      expect(str.styled).toEqual(['script']);
    });

    it('clear the merge flags', () => {
      const str = new AnsiString().close('type').open('script').clear();
      expect(str.mergeLeft).toBeFalse();
      expect(str.merge).toBeFalse();
    });
  });

  describe('open', () => {
    it('add an opening delimiter to the next word', () => {
      const str = new AnsiString().open('[').open('"').word('type');
      expect(str.strings).toEqual(['["type']);
      expect(str.styled).toEqual(['["type']);
    });

    it('avoid merging the previous word with the next word if the delimiter is empty', () => {
      const str = new AnsiString().word('type').open('').word('script');
      expect(str.strings).toEqual(['type', 'script']);
      expect(str.styled).toEqual(['type', 'script']);
    });

    it('add an opening delimiter at a specific position', () => {
      const str = new AnsiString().openAt('"', 0).word('type').openAt('[', 0);
      expect(str.strings).toEqual(['["type']);
      expect(str.styled).toEqual(['["type']);
    });
  });

  describe('other', () => {
    describe('when the self string is empty', () => {
      it('if the merge flag is set on the self string', () => {
        const str1 = new AnsiString().word('type');
        const str2 = new AnsiString();
        str2.merge = true;
        str2.other(str1);
        expect(str2.strings).toEqual(['type']);
        expect(str2.styled).toEqual(['type']);
      });

      it('if the merge flag is set on the other string', () => {
        const str1 = new AnsiString();
        str1.merge = true;
        str1.word('type');
        const str2 = new AnsiString().other(str1);
        expect(str2.strings).toEqual(['type']);
        expect(str2.styled).toEqual(['type']);
      });

      it('preserve the merge flag from the other string', () => {
        const str1 = new AnsiString().word('type');
        str1.merge = true;
        const str2 = new AnsiString().other(str1).word(']');
        expect(str2.strings).toEqual(['type]']);
        expect(str2.styled).toEqual(['type]']);
      });

      it('preserve the max length from the other string', () => {
        const str1 = new AnsiString().word('type');
        const str2 = new AnsiString().other(str1);
        expect(str2.maxLength).toEqual(4);
      });
    });

    describe('when the self string is not empty', () => {
      it('keep current style if the merge flag is set in the self string', () => {
        const str1 = new AnsiString().word('type');
        const str2 = new AnsiString().word('[');
        str2.merge = true;
        str2.pushSty(clr).other(str1);
        expect(str2.strings).toEqual(['[type']);
        expect(str2.styled).toEqual(['[' + clr + 'type']);
      });

      it('keep current style if the merge flag is set in the other string', () => {
        const str1 = new AnsiString();
        str1.merge = true;
        str1.word('type');
        const str2 = new AnsiString().word('[').pushSty(clr).other(str1);
        expect(str2.strings).toEqual(['[type']);
        expect(str2.styled).toEqual(['[' + clr + 'type']);
      });

      it('preserve the merge flag from the other string', () => {
        const str1 = new AnsiString().word('script');
        str1.merge = true;
        const str2 = new AnsiString().word('type').other(str1).word(']');
        expect(str2.strings).toEqual(['type', 'script]']);
        expect(str2.styled).toEqual(['type', 'script]']);
      });

      it('update the max length combined with the other string', () => {
        const str1 = new AnsiString().word('script');
        const str2 = new AnsiString().word('type').other(str1);
        expect(str2.maxLength).toEqual(6);
      });
    });

    describe('when the other string is empty', () => {
      it('preserve the merge flag from the other string', () => {
        const str1 = new AnsiString();
        str1.merge = true;
        const str2 = new AnsiString().word('type').other(str1).word(']');
        expect(str2.strings).toEqual(['type]']);
        expect(str2.styled).toEqual(['type]']);
      });
    });

    describe('when neither string is empty', () => {
      const cancel = style(tf.notBoldOrFaint);

      it('merge line feed from the other string', () => {
        const str1 = new AnsiString().break();
        const str2 = new AnsiString().open('type').other(str1).word('script');
        expect(str2.strings).toEqual(['type', '', 'script']);
        expect(str2.styled).toEqual(['type', '\n', 'script']);
      });

      it('merge the endpoint strings if the merge flag is set in the self string', () => {
        const str1 = new AnsiString().split('type script');
        const str2 = new AnsiString().open('[').other(str1).close(']');
        expect(str2.strings).toEqual(['[type', 'script]']);
        expect(str2.styled).toEqual(['[type', 'script]']);
      });

      it('merge the endpoint strings if the merge flag is set in the other string', () => {
        const str1 = new AnsiString();
        str1.merge = true;
        str1.split('type script');
        const str2 = new AnsiString().word('[').other(str1);
        expect(str2.strings).toEqual(['[type', 'script']);
        expect(str2.styled).toEqual(['[type', 'script']);
      });

      it('preserve the opening style from the other string', () => {
        const str1 = new AnsiString().pushSty(bold);
        const str2 = new AnsiString().other(str1).word('type').popSty();
        expect(str2.strings).toEqual(['type']);
        expect(str2.styled).toEqual([bold + 'type' + cancel]);
      });

      it('preserve the style stack from the other string', () => {
        const str1 = new AnsiString().pushSty(bold).word('type');
        const str2 = new AnsiString().other(str1).popSty();
        expect(str2.strings).toEqual(['type']);
        expect(str2.styled).toEqual([bold + 'type' + cancel]);
      });
    });
  });

  describe('close', () => {
    it('add a closing delimiter when there are no internal strings', () => {
      const str = new AnsiString().close(']');
      expect(str.strings).toEqual([']']);
      expect(str.styled).toEqual([']']);
    });

    it('add a closing delimiter when there are previous words', () => {
      const str = new AnsiString().word('type').close(']');
      expect(str.strings).toEqual(['type]']);
      expect(str.styled).toEqual(['type]']);
    });

    it('add a closing delimiter to the last internal string', () => {
      const sty = style(fg.default, bg.default);
      const str = new AnsiString().word('type').pushSty(sty).close(']').close('.');
      expect(str.strings).toEqual(['type].']);
      expect(str.styled).toEqual(['type' + sty + '].']);
    });

    it('avoid merging with the next word if the delimiter is empty', () => {
      const str = new AnsiString().word('type').close('').word('script');
      expect(str.strings).toEqual(['type', 'script']);
      expect(str.styled).toEqual(['type', 'script']);
    });
  });

  describe('pushSty and popSty', () => {
    it('preserve order of pushed styles', () => {
      const cancel = style(tf.notBoldOrFaint);
      const str = new AnsiString()
        .popSty() // does nothing
        .word('type')
        .pushSty(clr)
        .word('script')
        .pushSty(bold)
        .word('is')
        .pushSty(cancel)
        .word('very')
        .popSty() // should reapply tf.bold
        .word('very')
        .popSty() // should not reapply tf.clear, but should cancel bold
        .word('much')
        .popSty() // tf.clear needs no cancelling
        .word('fun')
        .popSty(); // does nothing
      expect(str.strings).toEqual(['type', 'script', 'is', 'very', 'very', 'much', 'fun']);
      expect(str.styled).toEqual([
        'type',
        clr + 'script',
        bold + 'is',
        cancel + 'very' + bold,
        'very' + cancel,
        'much',
        'fun',
      ]);
    });
  });

  describe('split', () => {
    it('split text with emojis', () => {
      const str = new AnsiString().split(`⚠️ type script`);
      expect(str.strings).toEqual(['⚠️', 'type', 'script']);
      expect(str.styled).toEqual(['⚠️', 'type', 'script']);
    });

    it('split text with duplicate inline styles', () => {
      const sty = style(tf.bold, tf.bold);
      const str = new AnsiString().split(`${bold}type ${bold}${bold} script${bold}`);
      expect(str.strings).toEqual(['type', 'script']);
      expect(str.styled).toEqual([bold + 'type', sty + 'script' + bold]);
    });

    it('split text with inline styles', () => {
      const str = new AnsiString().split(`type${bold} ${bold} ${bold}script`);
      expect(str.strings).toEqual(['type', 'script']);
      expect(str.styled).toEqual(['type' + bold, bold + '' + bold + 'script']);
    });

    it('split text with paragraphs', () => {
      const str = new AnsiString().split('type\nscript\n\nis\nfun');
      expect(str.strings).toEqual(['type', 'script', '', 'is', 'fun']);
      expect(str.styled).toEqual(['type', 'script', '\n\n', 'is', 'fun']);
    });

    it('split text with list items', () => {
      const str = new AnsiString().split('type:\n- script\n1. is fun');
      expect(str.strings).toEqual(['type:', '', '-', 'script', '', '1.', 'is', 'fun']);
      expect(str.styled).toEqual(['type:', '\n', '-', 'script', '\n', '1.', 'is', 'fun']);
    });

    describe('using placeholders', () => {
      it('insert text at the placeholder location', () => {
        const format = jest.fn(function (this: AnsiString) {
          this.word('abc');
        });
        const str = new AnsiString().split('[#0 script is #1]', format);
        expect(str.strings).toEqual(['[abc', 'script', 'is', 'abc]']);
        expect(str.styled).toEqual(['[abc', 'script', 'is', 'abc]']);
        expect(format).toHaveBeenCalledTimes(2);
        expect(format).toHaveBeenCalledWith('#0');
        expect(format).toHaveBeenCalledWith('#1');
      });

      it('avoid adding a line break to the first list item', () => {
        const format = jest.fn(function (this: AnsiString) {
          this.split('- item\n* item\n1. item');
        });
        const str = new AnsiString().split('#0', format);
        expect(str.strings).toEqual(['-', 'item', '', '*', 'item', '', '1.', 'item']);
        expect(str.styled).toEqual(['-', 'item', '\n', '*', 'item', '\n', '1.', 'item']);
        expect(format).toHaveBeenCalledTimes(1);
        expect(format).toHaveBeenCalledWith('#0');
      });

      it('avoid merging the last word with the next word when not inserting text', () => {
        const format = jest.fn();
        const str = new AnsiString().word('type').split('#0#0', format).word('script');
        expect(str.strings).toEqual(['type', 'script']);
        expect(str.styled).toEqual(['type', 'script']);
        expect(format).toHaveBeenCalledTimes(2);
        expect(format).toHaveBeenCalledWith('#0');
      });
    });

    it('preserve styles that are glued to the placeholder', () => {
      const format = jest.fn(function (this: AnsiString) {
        this.word('abc');
      });
      const str = new AnsiString().split(bold + '#0 is #1' + bold, format);
      expect(str.strings).toEqual(['abc', 'is', 'abc']);
      expect(str.styled).toEqual([bold + 'abc', 'is', 'abc' + bold]);
      expect(format).toHaveBeenCalledTimes(2);
      expect(format).toHaveBeenCalledWith('#0');
      expect(format).toHaveBeenCalledWith('#1');
    });
  });

  describe('wrap', () => {
    describe('no width is provided', () => {
      it('avoid wrapping', () => {
        const result: Array<string> = [];
        new AnsiString().split('abc def').wrap(result, 0, 0, false, true);
        expect(result).toEqual(['abc', ' def']);
      });

      it('preserve line breaks', () => {
        const result: Array<string> = [];
        new AnsiString().split('abc\n\ndef').wrap(result, 0, 0, false, true);
        expect(result).toEqual(['abc', '\n\n', 'def']);
      });

      it('preserve emojis', () => {
        const result: Array<string> = [];
        new AnsiString().split('⚠️ abc').wrap(result, 0, 0, false, true);
        expect(result).toEqual(['⚠️', ' abc']);
      });

      it('omit styles', () => {
        const result: Array<string> = [];
        new AnsiString().split(`abc${clr} def`).wrap(result, 0, 0, false, true);
        expect(result).toEqual(['abc', ' def']);
      });

      describe('the current column is not zero', () => {
        it('avoid shortening the current line by removing previous strings', () => {
          const result = ['  '];
          new AnsiString().split('abc def').wrap(result, 2, 0, false, true);
          expect(result).toEqual(['  ', ' abc', ' def']);
        });

        it('avoid adjusting the current line if the string is empty', () => {
          const result = ['  '];
          new AnsiString().wrap(result, 2, 0, false, true);
          expect(result).toEqual(['  ']);
        });

        it('avoid adjusting the current line if the string starts with a line break', () => {
          const result = ['  '];
          new AnsiString().break().wrap(result, 2, 0, false, true);
          expect(result).toEqual(['  ', '\n']);
        });

        describe('emitting styles', () => {
          it('adjust the current line with a single space even if spaces are not required', () => {
            const result: Array<string> = [];
            new AnsiString().split('abc def').wrap(result, 2, 0, true, false);
            expect(result).toEqual([' abc', ' def']);
          });

          it('adjust the current line with a single space when spaces are required', () => {
            const result: Array<string> = [];
            new AnsiString().split('abc def').wrap(result, 2, 0, true, true);
            expect(result).toEqual([' abc', ' def']);
          });
        });
      });

      describe('the starting column is not zero', () => {
        it('adjust the current line with indentation', () => {
          const result: Array<string> = [];
          new AnsiString(2).word('abc').wrap(result, 0, 0, false, true);
          expect(result).toEqual(['  ', 'abc']);
        });

        it('keep indentation in new lines', () => {
          const result: Array<string> = [];
          new AnsiString(2).split('abc\n\ndef').wrap(result, 0, 0, false, true);
          expect(result).toEqual(['  ', 'abc', '\n\n', '  ', 'def']);
        });

        it('avoid adjusting the current line if the string is empty', () => {
          const result: Array<string> = [];
          new AnsiString(2).wrap(result, 0, 0, false, true);
          expect(result).toEqual([]);
        });

        it('avoid adjusting the current line if the string starts with a line break', () => {
          const result: Array<string> = [];
          new AnsiString(2).break().wrap(result, 0, 0, false, true);
          expect(result).toEqual(['\n']);
        });

        describe('the current column is not zero', () => {
          it('avoid shortening the current line by resizing previous strings', () => {
            const result = ['   '];
            new AnsiString(2).split('abc def').wrap(result, 3, 0, false, true);
            expect(result).toEqual(['   ', ' abc', ' def']);
          });

          it('avoid adjusting the current line if the current column is the starting column', () => {
            const result = ['  '];
            new AnsiString(2).split('abc def').wrap(result, 2, 0, false, true);
            expect(result).toEqual(['  ', 'abc', ' def']);
          });
        });

        describe('emitting styles', () => {
          const moveFwd2 = seq(cs.cuf, 2);

          it('adjust the current line with a move sequence', () => {
            const result: Array<string> = [];
            new AnsiString(2).split('abc def').wrap(result, 0, 0, true, false);
            expect(result).toEqual(['' + moveFwd2, 'abc', ' def']);
          });

          it('keep indentation in new lines with a move sequence', () => {
            const result: Array<string> = [];
            new AnsiString(2).split('abc\n\ndef').wrap(result, 0, 0, true, false);
            expect(result).toEqual(['' + moveFwd2, 'abc', '\n\n', '' + moveFwd2, 'def']);
          });

          it('adjust the current line with spaces', () => {
            const result: Array<string> = [];
            new AnsiString(2).split('abc def').wrap(result, 0, 0, true, true);
            expect(result).toEqual(['  ', 'abc', ' def']);
          });

          it('keep indentation in new lines with spaces', () => {
            const result: Array<string> = [];
            new AnsiString(2).split('abc\n\ndef').wrap(result, 0, 0, true, true);
            expect(result).toEqual(['  ', 'abc', '\n\n', '  ', 'def']);
          });
        });
      });

      describe('emitting styles', () => {
        const str = new AnsiString().split(`abc${clr} def`);

        it('emit styles with move sequences', () => {
          const result: Array<string> = [];
          str.wrap(result, 0, 0, true, false);
          expect(result).toEqual(['abc' + clr, ' def']);
        });

        it('emit styles with spaces', () => {
          const result: Array<string> = [];
          str.wrap(result, 0, 0, true, true);
          expect(result).toEqual(['abc' + clr, ' def']);
        });
      });
    });

    describe('a width is provided', () => {
      it('wrap the text', () => {
        const result: Array<string> = [];
        new AnsiString().split('abc largest').wrap(result, 0, 8, false, true);
        expect(result).toEqual(['abc', '\n', 'largest']);
      });

      it('preserve line breaks', () => {
        const result: Array<string> = [];
        new AnsiString().split('abc\n\nlargest').wrap(result, 0, 8, false, true);
        expect(result).toEqual(['abc', '\n\n', 'largest']);
      });

      it('preserve emojis', () => {
        const result: Array<string> = [];
        new AnsiString().split('⚠️ largest').wrap(result, 0, 8, false, true);
        expect(result).toEqual(['⚠️', '\n', 'largest']);
      });

      it('omit styles', () => {
        const result: Array<string> = [];
        new AnsiString().split(`abc${clr} largest`).wrap(result, 0, 8, false, true);
        expect(result).toEqual(['abc', '\n', 'largest']);
      });

      it('wrap merged words', () => {
        const result: Array<string> = [];
        new AnsiString().open('[').split('abc largest').close(']').wrap(result, 0, 12, false, true);
        expect(result).toEqual(['[abc', '\n', 'largest]']);
      });

      describe('the current column is not zero', () => {
        it('add a line break when the largest word does not fit', () => {
          const result: Array<string> = [];
          new AnsiString().split('abc largest').wrap(result, 2, 5, false, true);
          expect(result).toEqual(['\n', 'abc', '\n', 'largest']);
        });

        it('avoid adding a line break when the largest word does not fit, if the string starts with a line break', () => {
          const result: Array<string> = [];
          new AnsiString().break().split('abc largest').wrap(result, 2, 5, false, true);
          expect(result).toEqual(['\n', 'abc', '\n', 'largest']);
        });

        it('add a line break when a merged word does not fit the width', () => {
          const result: Array<string> = [];
          const str = new AnsiString().word('gest');
          new AnsiString().word('abc').open('lar').other(str).wrap(result, 2, 5, false, true);
          expect(result).toEqual(['\n', 'abc', '\n', 'largest']);
        });
      });

      describe('the starting column is not zero', () => {
        it('adjust the current line with indentation if the largest word fits', () => {
          const result: Array<string> = [];
          new AnsiString(1).split('abc largest').wrap(result, 0, 8, false, true);
          expect(result).toEqual([' ', 'abc', '\n ', 'largest']);
        });

        it('keep indentation in new lines if the largest word fits', () => {
          const result: Array<string> = [];
          new AnsiString(1).split('abc\n\nlargest').wrap(result, 0, 8, false, true);
          expect(result).toEqual([' ', 'abc', '\n\n', ' ', 'largest']);
        });

        it('keep indentation in wrapped lines if the largest word fits', () => {
          const result: Array<string> = [];
          new AnsiString(1).split('abc largest').wrap(result, 0, 8, false, true);
          expect(result).toEqual([' ', 'abc', '\n ', 'largest']);
        });

        it('avoid keeping indentation when the largest word does not fit', () => {
          const result: Array<string> = [];
          new AnsiString(1).split('abc largest').wrap(result, 0, 5, false, true);
          expect(result).toEqual(['abc', '\n', 'largest']);
        });

        describe('emitting styles', () => {
          const moveFwd1 = seq(cs.cuf, 1);

          it('keep indentation in wrapped lines with a move sequence', () => {
            const result: Array<string> = [];
            new AnsiString(1).split('abc largest').wrap(result, 0, 8, true, false);
            expect(result).toEqual(['' + moveFwd1, 'abc', '\n' + moveFwd1, 'largest']);
          });

          it('keep indentation in wrapped lines with spaces', () => {
            const result: Array<string> = [];
            new AnsiString(1).split('abc largest').wrap(result, 0, 8, true, true);
            expect(result).toEqual([' ', 'abc', '\n ', 'largest']);
          });
        });
      });

      describe('right-aligned', () => {
        const moveFwd2 = seq(cs.cuf, 2);
        const moveFwd4 = seq(cs.cuf, 4);
        const moveFwd5 = seq(cs.cuf, 5);

        it('align with spaces when breaking the line', () => {
          const result: Array<string> = [];
          new AnsiString(0, true).word('abc').break().wrap(result, 0, 8, false, true);
          expect(result).toEqual(['     ', 'abc', '\n']);
        });

        it('align with spaces when wrapping the line', () => {
          const result: Array<string> = [];
          new AnsiString(0, true).split('type script').wrap(result, 0, 8, false, true);
          expect(result).toEqual(['    ', 'type', '\n', '  ', 'script']);
        });

        describe('emitting styles', () => {
          it('align with a move sequence when breaking the line', () => {
            const result: Array<string> = [];
            new AnsiString(0, true).word('abc').break().wrap(result, 0, 8, true, false);
            expect(result).toEqual(['' + moveFwd5, 'abc', '\n']);
          });

          it('align with a move sequence when wrapping the line', () => {
            const result: Array<string> = [];
            new AnsiString(0, true).split('type script').wrap(result, 0, 8, true, false);
            expect(result).toEqual(['' + moveFwd4, 'type', '\n', '' + moveFwd2, 'script']);
          });

          it('align with spaces when breaking the line', () => {
            const result: Array<string> = [];
            new AnsiString(0, true).word('abc').break().wrap(result, 0, 8, true, true);
            expect(result).toEqual(['     ', 'abc', '\n']);
          });

          it('align with spaces when wrapping the line', () => {
            const result: Array<string> = [];
            new AnsiString(0, true).split('type script').wrap(result, 0, 8, true, true);
            expect(result).toEqual(['    ', 'type', '\n', '  ', 'script']);
          });
        });
      });
    });
  });

  describe('format', () => {
    it('preserve a merge flag set before formatting', () => {
      const str1 = new AnsiString().split('type script');
      const str2 = new AnsiString().open('[').format('#0', {}, str1);
      expect(str2.strings).toEqual(['[type', 'script']);
    });

    it('preserve add closing word to a formatted generic value', () => {
      const str = new AnsiString().format('#0', {}, () => 1).close('.');
      expect(str.strings).toEqual(['<()', '=>', '1>.']);
    });

    it('format single-valued arguments out of order', () => {
      const str = new AnsiString().format(
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
      expect(str.strings).toEqual([
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
        'script]',
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
        '1>}',
      ]);
    });
  });

  describe('toString', () => {
    it('separates words with spaces and does not emit line feeds or control sequences', () => {
      const str = new AnsiString().break().pushSty(bold).word('type').word('script').popSty();
      expect('' + str).toEqual(' type script');
    });
  });
});

describe('AnsiMessage', () => {
  afterEach(() => {
    ['NO_COLOR', 'FORCE_COLOR', 'FORCE_WIDTH'].forEach((key) => delete process.env[key]);
  });

  it('wrap the message while respecting the environment configuration', () => {
    const str = new AnsiString().split('type script');
    const msg = new AnsiMessage(str);
    expect(msg.wrap(0)).toEqual('type script');
    expect(msg.wrap(11)).toEqual('type script');
    process.env['NO_COLOR'] = '1';
    expect(msg.wrap(0)).toEqual('type script');
    expect(msg.wrap(11)).toEqual('type script');
    process.env['FORCE_COLOR'] = '1';
    expect(msg.wrap(0)).toEqual('type script');
    expect(msg.wrap(11)).toEqual('type script');
    process.env['FORCE_WIDTH'] = '10';
    expect(msg.message).toEqual('type\nscript');
  });

  it('produce a string message', () => {
    const str = new AnsiString().split('type script');
    const msg = new AnsiMessage(str);
    process.env['FORCE_WIDTH'] = '0';
    expect(msg.message).toEqual('type script');
  });
});

describe('WarnMessage', () => {
  afterEach(() => {
    ['FORCE_WIDTH'].forEach((key) => delete process.env[key]);
  });

  it('wrap the message while respecting the environment configuration', () => {
    const str = new AnsiString().split('type script');
    const msg = new WarnMessage(str);
    process.env['FORCE_WIDTH'] = '10';
    expect(msg.message).toEqual('type\nscript');
  });

  it('produce a string message', () => {
    const str = new AnsiString().split('type script');
    const msg = new WarnMessage(str);
    process.env['FORCE_WIDTH'] = '0';
    expect(msg.message).toEqual('type script');
  });

  describe('add', () => {
    it('format a string message with an error phrase', () => {
      const msg = new WarnMessage();
      msg.add(ErrorItem.missingRequiredOption, {}, 'abc');
      process.env['FORCE_WIDTH'] = '0';
      expect(msg.message).toEqual(`Option 'abc' is required.\n`);
    });
  });

  describe('addCustom', () => {
    it('format a string message with a custom phrase', () => {
      const msg = new WarnMessage();
      msg.addCustom('#0 #1 #2', {}, 0, 'abc', false);
      process.env['FORCE_WIDTH'] = '0';
      expect(msg.message).toEqual(`0 'abc' false\n`);
    });
  });
});

describe('ErrorMessage', () => {
  afterEach(() => {
    ['FORCE_WIDTH'].forEach((key) => delete process.env[key]);
  });

  describe('create', () => {
    it('format a string message with an error phrase', () => {
      const msg = ErrorMessage.create(ErrorItem.missingRequiredOption, {}, 'abc');
      process.env['FORCE_WIDTH'] = '0';
      expect(msg.message).toEqual(`Option 'abc' is required.\n`);
    });
  });

  describe('createCustom', () => {
    it('format a string message with a custom phrase', () => {
      const msg = ErrorMessage.createCustom('#0 #1 #2', {}, 0, 'abc', false);
      process.env['FORCE_WIDTH'] = '0';
      expect(msg.message).toEqual(`0 'abc' false\n`);
    });
  });
});

describe('TextMessage', () => {
  it('produce a string message with line feeds', () => {
    const msg = new TextMessage('type', 'script');
    expect(msg.message).toEqual('type\nscript');
  });
});
