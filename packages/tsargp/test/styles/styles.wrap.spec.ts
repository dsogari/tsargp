import { describe, expect, it } from 'bun:test';
import { AnsiString, cs, tf, seq, style } from '../../src/library';

const clr = style(tf.clear);

describe('AnsiString', () => {
  describe('wrap', () => {
    describe('no width is provided', () => {
      it('avoid wrapping', () => {
        const result: Array<string> = [];
        new AnsiString().split('abc def').wrap(result);
        expect(result).toEqual(['abc', ' def']);
      });

      it('preserve line breaks', () => {
        const result: Array<string> = [];
        new AnsiString().split('abc\n\ndef').wrap(result);
        expect(result).toEqual(['abc', '\n', '\n', 'def']);
      });

      it('preserve emojis', () => {
        const result: Array<string> = [];
        new AnsiString().split('⚠️ abc').wrap(result);
        expect(result).toEqual(['⚠️', ' abc']);
      });

      it('omit styles', () => {
        const result: Array<string> = [];
        new AnsiString().split(`abc${clr} def`).wrap(result);
        expect(result).toEqual(['abc', ' def']);
      });

      describe('the current column is not zero', () => {
        it('avoid shortening the current line by removing previous strings', () => {
          const result = ['  '];
          new AnsiString().split('abc def').wrap(result, 2);
          expect(result).toEqual(['  ', ' abc', ' def']);
        });

        it('avoid adjusting the current line if the string is empty', () => {
          const result = ['  '];
          new AnsiString().wrap(result, 2);
          expect(result).toEqual(['  ']);
        });

        it('avoid adjusting the current line if the string starts with a line break', () => {
          const result = ['  '];
          new AnsiString().break().wrap(result, 2);
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
          new AnsiString(2).word('abc').wrap(result);
          expect(result).toEqual(['  abc']);
        });

        it('keep indentation in new lines', () => {
          const result: Array<string> = [];
          new AnsiString(2).split('abc\n\ndef').wrap(result);
          expect(result).toEqual(['  abc', '\n', '\n', '  def']);
        });

        it('avoid adjusting the current line if the string is empty', () => {
          const result: Array<string> = [];
          new AnsiString(2).wrap(result);
          expect(result).toEqual([]);
        });

        it('avoid adjusting the current line if the string starts with a line break', () => {
          const result: Array<string> = [];
          new AnsiString(2).break().wrap(result);
          expect(result).toEqual(['\n']);
        });

        describe('the current column is not zero', () => {
          it('avoid shortening the current line by resizing previous strings', () => {
            const result = ['   '];
            new AnsiString(2).split('abc def').wrap(result, 3);
            expect(result).toEqual(['   ', ' abc', ' def']);
          });

          it('adjust the current line if the current column is the starting column', () => {
            const result = ['  '];
            new AnsiString(2).split('abc def').wrap(result, 2);
            expect(result).toEqual(['  ', ' abc', ' def']);
          });

          it('adjust the current line if the current column is less than the starting column', () => {
            const result = [' '];
            new AnsiString(2).split('abc def').wrap(result, 1);
            expect(result).toEqual([' ', ' abc', ' def']);
          });
        });

        describe('emitting styles', () => {
          const moveFwd2 = seq(cs.cuf, 2);

          it('adjust the current line with a move sequence', () => {
            const result: Array<string> = [];
            new AnsiString(2).split('abc def').wrap(result, 0, 0, true, false);
            expect(result).toEqual([moveFwd2 + 'abc', ' def']);
          });

          it('keep indentation in new lines with a move sequence', () => {
            const result: Array<string> = [];
            new AnsiString(2).split('abc\n\ndef').wrap(result, 0, 0, true, false);
            expect(result).toEqual([moveFwd2 + 'abc', '\n', '\n', moveFwd2 + 'def']);
          });

          it('adjust the current line with spaces', () => {
            const result: Array<string> = [];
            new AnsiString(2).split('abc def').wrap(result, 0, 0, true, true);
            expect(result).toEqual(['  abc', ' def']);
          });

          it('keep indentation in new lines with spaces', () => {
            const result: Array<string> = [];
            new AnsiString(2).split('abc\n\ndef').wrap(result, 0, 0, true, true);
            expect(result).toEqual(['  abc', '\n', '\n', '  def']);
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

      describe('right-aligned', () => {
        it('do not align when breaking the line', () => {
          const result: Array<string> = [];
          new AnsiString(0, 'right').word('abc').break().wrap(result);
          expect(result).toEqual(['abc', '\n']);
        });
      });
    });

    describe('a width is provided', () => {
      it('wrap the text', () => {
        const result: Array<string> = [];
        new AnsiString(0, 'left', 8).split('abc largest').wrap(result);
        expect(result).toEqual(['abc', '\n', 'largest']);
      });

      it('preserve line breaks', () => {
        const result: Array<string> = [];
        new AnsiString(0, 'left', 8).split('abc\n\nlargest').wrap(result);
        expect(result).toEqual(['abc', '\n', '\n', 'largest']);
      });

      it('preserve emojis', () => {
        const result: Array<string> = [];
        new AnsiString(0, 'left', 8).split('⚠️ largest').wrap(result);
        expect(result).toEqual(['⚠️', '\n', 'largest']);
      });

      it('omit styles', () => {
        const result: Array<string> = [];
        new AnsiString(0, 'left', 8).split(`abc${clr} largest`).wrap(result);
        expect(result).toEqual(['abc', '\n', 'largest']);
      });

      it('wrap merged words', () => {
        const result: Array<string> = [];
        new AnsiString(0, 'left', 12).open('[').split('abc largest').close(']').wrap(result);
        expect(result).toEqual(['[abc', '\n', 'largest]']);
      });

      describe('the current column is not zero', () => {
        it('add a line break when the largest word does not fit the configured width', () => {
          const result: Array<string> = [];
          new AnsiString(0, 'left', 5).split('abc largest').wrap(result, 2);
          expect(result).toEqual(['\n', 'abc', '\n', 'largest']);
        });

        it('add a line break when the largest word does not fit the terminal width', () => {
          const result: Array<string> = [];
          new AnsiString(0, 'left', 10).split('abc largest').wrap(result, 2, 5);
          expect(result).toEqual(['\n', 'abc', '\n', 'largest']);
        });

        it('avoid adding a line break when the largest word does not fit, if the string starts with a line break', () => {
          const result: Array<string> = [];
          new AnsiString(0, 'left', 5).break().split('abc largest').wrap(result, 2);
          expect(result).toEqual(['\n', 'abc', '\n', 'largest']);
        });

        it('add a line break when a merged word does not fit the width', () => {
          const result: Array<string> = [];
          const str = new AnsiString().word('gest');
          new AnsiString(0, 'left', 5).word('abc').open('lar').other(str).wrap(result, 2);
          expect(result).toEqual(['\n', 'abc', '\n', 'largest']);
        });

        it('add a line break when a word does not fit the width', () => {
          const result: Array<string> = [];
          new AnsiString(0, 'left', 5).word('word').wrap(result, 2);
          expect(result).toEqual(['\n', 'word']);
        });

        it('avoid adding a line break when a word fits the width', () => {
          const result: Array<string> = [];
          new AnsiString(0, 'left', 8).word('word').wrap(result, 2);
          expect(result).toEqual([' word']);
        });
      });

      describe('the starting column is not zero', () => {
        it('adjust the current line with indentation if the largest word fits', () => {
          const result: Array<string> = [];
          new AnsiString(1, 'left', 8).split('abc largest').wrap(result);
          expect(result).toEqual([' abc', '\n', ' largest']);
        });

        it('keep indentation in new lines if the largest word fits', () => {
          const result: Array<string> = [];
          new AnsiString(1, 'left', 8).split('abc\n\nlargest').wrap(result);
          expect(result).toEqual([' abc', '\n', '\n', ' largest']);
        });

        it('keep indentation in wrapped lines if the largest word fits', () => {
          const result: Array<string> = [];
          new AnsiString(1, 'left', 8).split('abc largest').wrap(result);
          expect(result).toEqual([' abc', '\n', ' largest']);
        });

        it('avoid keeping indentation when the largest word does not fit', () => {
          const result: Array<string> = [];
          new AnsiString(1, 'left', 5).split('abc largest').wrap(result);
          expect(result).toEqual(['abc', '\n', 'largest']);
        });

        describe('the current column is not zero', () => {
          it('add a line break when a word does not fit the width', () => {
            const result: Array<string> = [];
            new AnsiString(2, 'left', 6).word('word').wrap(result, 4);
            expect(result).toEqual(['\n', '  word']);
          });

          it('avoid adding a line break when a word fits the width', () => {
            const result: Array<string> = [];
            new AnsiString(2, 'left', 6).word('word').wrap(result, 3);
            expect(result).toEqual([' word']);
          });
        });

        describe('emitting styles', () => {
          const moveFwd1 = seq(cs.cuf, 1);

          it('keep indentation in wrapped lines with a move sequence', () => {
            const result: Array<string> = [];
            new AnsiString(1).split('abc largest').wrap(result, 0, 8, true, false);
            expect(result).toEqual([moveFwd1 + 'abc', '\n', moveFwd1 + 'largest']);
          });

          it('keep indentation in wrapped lines with spaces', () => {
            const result: Array<string> = [];
            new AnsiString(1).split('abc largest').wrap(result, 0, 8, true, true);
            expect(result).toEqual([' abc', '\n', ' largest']);
          });
        });
      });

      describe('right-aligned', () => {
        const moveFwd2 = seq(cs.cuf, 2);
        const moveFwd4 = seq(cs.cuf, 4);
        const moveFwd5 = seq(cs.cuf, 5);

        it('align with spaces when breaking the line', () => {
          const result: Array<string> = [];
          new AnsiString(0, 'right', 8).word('abc').break().wrap(result);
          expect(result).toEqual(['     ', 'abc', '\n']);
        });

        it('align with spaces when wrapping the line', () => {
          const result: Array<string> = [];
          new AnsiString(0, 'right', 8).split('type script').wrap(result);
          expect(result).toEqual(['    ', 'type', '\n', '  ', 'script']);
        });

        describe('the starting column and current column are not zero', () => {
          it('align when the largest word does not fit ', () => {
            const result: Array<string> = [];
            new AnsiString(1, 'right', 5).split('abc largest').wrap(result, 2);
            expect(result).toEqual(['\n', '   ', 'abc', '\n', 'largest']);
          });
        });

        describe('emitting styles', () => {
          it('align with a move sequence when breaking the line', () => {
            const result: Array<string> = [];
            new AnsiString(0, 'right').word('abc').break().wrap(result, 0, 8, true, false);
            expect(result).toEqual(['' + moveFwd5, 'abc', '\n']);
          });

          it('align with a move sequence when wrapping the line', () => {
            const result: Array<string> = [];
            new AnsiString(0, 'right').split('type script').wrap(result, 0, 8, true, false);
            expect(result).toEqual(['' + moveFwd4, 'type', '\n', '' + moveFwd2, 'script']);
          });

          it('align with spaces when breaking the line', () => {
            const result: Array<string> = [];
            new AnsiString(0, 'right').word('abc').break().wrap(result, 0, 8, true, true);
            expect(result).toEqual(['     ', 'abc', '\n']);
          });

          it('align with spaces when wrapping the line', () => {
            const result: Array<string> = [];
            new AnsiString(0, 'right').split('type script').wrap(result, 0, 8, true, true);
            expect(result).toEqual(['    ', 'type', '\n', '  ', 'script']);
          });
        });
      });
    });

    describe('with hooks', () => {
      describe('left-aligned', () => {
        describe('when the head is the only string', () => {
          it('throw an error when the largest word does not fit the configured width', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'left', 4).split('type script');
            str.hook = new AnsiString(); // tail
            expect(() => str.wrap(result)).toThrow('Cannot wrap word of length 6');
          });

          it('wrap multiple lines with indentation', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'left', 6).split('type script is fun');
            str.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual(['  type', '\n', '  script', '\n', '  is', ' fun']);
          });
        });

        describe('when the head has more lines than the rest', () => {
          it('wrap a column that has the first line but not the second', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'left', 6).split('type script is fun');
            str.hook = new AnsiString(10, 'left', 6).split('type script').break(); // feed ignored
            str.hook.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual([
              '  type',
              '    type',
              '\n',
              '  script',
              '  script',
              '\n',
              '  is',
              ' fun',
            ]);
          });

          it('wrap a column that has the second line but not the first', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'left', 6).split('type script is fun');
            str.hook = new AnsiString(10, 'left', 6).break().split('type script');
            str.hook.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual([
              '  type',
              '\n',
              '  script',
              '  type',
              '\n',
              '  is',
              ' fun',
              '  script',
            ]);
          });
        });

        describe('when the head has less lines than the rest', () => {
          it('wrap a column that has the first line but not the second', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'left', 6).split('type script').break(); // feed ignored
            str.hook = new AnsiString(10, 'left', 6).split('type script is fun');
            str.hook.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual([
              '  type',
              '    type',
              '\n',
              '  script',
              '  script',
              '\n',
              '          is',
              ' fun',
            ]);
          });

          it('wrap a column that has the second line but not the first', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'left', 6).break().split('type script');
            str.hook = new AnsiString(10, 'left', 6).split('type script is fun');
            str.hook.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual([
              '          type',
              '\n',
              '  type',
              '    script',
              '\n',
              '  script',
              '  is',
              ' fun',
            ]);
          });
        });

        describe('when the middle has more lines than the rest', () => {
          it('wrap a column that has the first line but not the second', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'left', 6).split('type script').break(); // feed ignored
            str.hook = new AnsiString(10, 'left', 6).split('type script is fun');
            str.hook.hook = new AnsiString(18, 'left', 6).split('type script').break(); // feed ignored
            str.hook.hook.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual([
              '  type',
              '    type',
              '    type',
              '\n',
              '  script',
              '  script',
              '  script',
              '\n',
              '          is',
              ' fun',
            ]);
          });

          it('wrap a column that has the second line but not the first', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'left', 6).break().split('type script');
            str.hook = new AnsiString(10, 'left', 6).split('type script is fun');
            str.hook.hook = new AnsiString(18, 'left', 6).break().split('type script');
            str.hook.hook.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual([
              '          type',
              '\n',
              '  type',
              '    script',
              '  type',
              '\n',
              '  script',
              '  is',
              ' fun',
              '  script',
            ]);
          });
        });

        describe('when the middle has less lines than the rest', () => {
          it('wrap a column that has the first line but not the second', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'left', 6).split('type script is fun');
            str.hook = new AnsiString(10, 'left', 6).split('type script').break(); // feed ignored
            str.hook.hook = new AnsiString(18, 'left', 6).split('type script is fun');
            str.hook.hook.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual([
              '  type',
              '    type',
              '    type',
              '\n',
              '  script',
              '  script',
              '  script',
              '\n',
              '  is',
              ' fun',
              '          is',
              ' fun',
            ]);
          });

          it('wrap a column that has the second line but not the first', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'left', 6).split('type script is fun');
            str.hook = new AnsiString(10, 'left', 6).break().split('type script');
            str.hook.hook = new AnsiString(18, 'left', 6).split('type script is fun');
            str.hook.hook.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual([
              '  type',
              '            type',
              '\n',
              '  script',
              '  type',
              '    script',
              '\n',
              '  is',
              ' fun',
              '  script',
              '  is',
              ' fun',
            ]);
          });
        });
      });

      describe('right-aligned', () => {
        describe('when the head is the only string', () => {
          it('wrap multiple lines with indentation', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'right', 6).split('type script is fun');
            str.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual(['  ', '  type', '\n', '  script', '\n', '  is', ' fun']);
          });
        });

        describe('when the head has more lines than the rest', () => {
          it('wrap a column that has the first line but not the second', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'right', 6).split('type script is fun');
            str.hook = new AnsiString(10, 'right', 6).split('type script').break(); // feed ignored
            str.hook.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual([
              '  ',
              '  type',
              '  ',
              '  type',
              '\n',
              '  script',
              '  script',
              '\n',
              '  is',
              ' fun',
            ]);
          });

          it('wrap a column that has the second line but not the first', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'right', 6).split('type script is fun');
            str.hook = new AnsiString(10, 'right', 6).break().split('type script');
            str.hook.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual([
              '  ',
              '  type',
              '\n',
              '  script',
              '  ',
              '  type',
              '\n',
              '  is',
              ' fun',
              '  script',
            ]);
          });
        });

        describe('when the head has less lines than the rest', () => {
          it('wrap a column that has the first line but not the second', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'right', 6).split('type script').break(); // feed ignored
            str.hook = new AnsiString(10, 'right', 6).split('type script is fun');
            str.hook.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual([
              '  ',
              '  type',
              '  ',
              '  type',
              '\n',
              '  script',
              '  script',
              '\n',
              '          is',
              ' fun',
            ]);
          });

          it('wrap a column that has the second line but not the first', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'right', 6).break().split('type script');
            str.hook = new AnsiString(10, 'right', 6).split('type script is fun');
            str.hook.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual([
              '  ',
              '          type',
              '\n',
              '  ',
              '  type',
              '  script',
              '\n',
              '  script',
              '  is',
              ' fun',
            ]);
          });
        });

        describe('when the middle has more lines than the rest', () => {
          it('wrap a column that has the first line but not the second', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'right', 6).split('type script').break(); // feed ignored
            str.hook = new AnsiString(10, 'right', 6).split('type script is fun');
            str.hook.hook = new AnsiString(18, 'right', 6).split('type script').break(); // feed ignored
            str.hook.hook.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual([
              '  ',
              '  type',
              '  ',
              '  type',
              '  ',
              '  type',
              '\n',
              '  script',
              '  script',
              '  script',
              '\n',
              '          is',
              ' fun',
            ]);
          });

          it('wrap a column that has the second line but not the first', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'right', 6).break().split('type script');
            str.hook = new AnsiString(10, 'right', 6).split('type script is fun');
            str.hook.hook = new AnsiString(18, 'right', 6).break().split('type script');
            str.hook.hook.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual([
              '  ',
              '          type',
              '\n',
              '  ',
              '  type',
              '  script',
              '  ',
              '  type',
              '\n',
              '  script',
              '  is',
              ' fun',
              '  script',
            ]);
          });
        });

        describe('when the middle has less lines than the rest', () => {
          it('wrap a column that has the first line but not the second', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'right', 6).split('type script is fun');
            str.hook = new AnsiString(10, 'right', 6).split('type script').break(); // feed ignored
            str.hook.hook = new AnsiString(18, 'right', 6).split('type script is fun');
            str.hook.hook.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual([
              '  ',
              '  type',
              '  ',
              '  type',
              '  ',
              '  type',
              '\n',
              '  script',
              '  script',
              '  script',
              '\n',
              '  is',
              ' fun',
              '          is',
              ' fun',
            ]);
          });

          it('wrap a column that has the second line but not the first', () => {
            const result: Array<string> = [];
            const str = new AnsiString(2, 'right', 6).split('type script is fun');
            str.hook = new AnsiString(10, 'right', 6).break().split('type script');
            str.hook.hook = new AnsiString(18, 'right', 6).split('type script is fun');
            str.hook.hook.hook = new AnsiString(); // tail
            str.wrap(result);
            expect(result).toEqual([
              '  ',
              '  type',
              '  ',
              '          type',
              '\n',
              '  script',
              '  ',
              '  type',
              '  script',
              '\n',
              '  is',
              ' fun',
              '  script',
              '  is',
              ' fun',
            ]);
          });
        });
      });
    });
  });
});
