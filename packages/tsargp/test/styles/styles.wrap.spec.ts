import { describe, expect, it } from 'bun:test';
import { AnsiString, tf } from '../../src/library';

const bold = [tf.bold];

const boldStr = '\x1b[1m';
const notBoldStr = '\x1b[22m';
const moveFwd1 = '\x1b[1C';
const moveFwd2 = '\x1b[2C';
const moveFwd4 = '\x1b[4C';
const moveFwd5 = '\x1b[5C';

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
        new AnsiString(bold).split('abc def').wrap(result);
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
            new AnsiString().split('abc def').wrap(result, 2, 0, true);
            expect(result).toEqual([' abc', ' def']);
          });
        });
      });

      describe('the starting column is not zero', () => {
        it('adjust the current line with indentation', () => {
          const result: Array<string> = [];
          new AnsiString([], 2).append('abc').wrap(result);
          expect(result).toEqual(['  abc']);
        });

        it('keep indentation in new lines', () => {
          const result: Array<string> = [];
          new AnsiString([], 2).split('abc\n\ndef').wrap(result);
          expect(result).toEqual(['  abc', '\n', '\n', '  def']);
        });

        it('avoid adjusting the current line if the string is empty', () => {
          const result: Array<string> = [];
          new AnsiString([], 2).wrap(result);
          expect(result).toEqual([]);
        });

        it('avoid adjusting the current line if the string starts with a line break', () => {
          const result: Array<string> = [];
          new AnsiString([], 2).break().wrap(result);
          expect(result).toEqual(['\n']);
        });

        describe('the current column is not zero', () => {
          it('avoid shortening the current line by resizing previous strings', () => {
            const result = ['   '];
            new AnsiString([], 2).split('abc def').wrap(result, 3);
            expect(result).toEqual(['   ', ' abc', ' def']);
          });

          it('adjust the current line if the current column is the starting column', () => {
            const result = ['  '];
            new AnsiString([], 2).split('abc def').wrap(result, 2);
            expect(result).toEqual(['  ', ' abc', ' def']);
          });

          it('adjust the current line if the current column is less than the starting column', () => {
            const result = [' '];
            new AnsiString([], 2).split('abc def').wrap(result, 1);
            expect(result).toEqual([' ', ' abc', ' def']);
          });
        });

        describe('emitting styles', () => {
          it('adjust the current line with a move sequence', () => {
            const result: Array<string> = [];
            new AnsiString([], 2).split('abc def').wrap(result, 0, 0, true, false);
            expect(result).toEqual([moveFwd2 + 'abc', ' def']);
          });

          it('keep indentation in new lines with a move sequence', () => {
            const result: Array<string> = [];
            new AnsiString([], 2).split('abc\n\ndef').wrap(result, 0, 0, true, false);
            expect(result).toEqual([moveFwd2 + 'abc', '\n', '\n', moveFwd2 + 'def']);
          });

          it('adjust the current line with spaces', () => {
            const result: Array<string> = [];
            new AnsiString([], 2).split('abc def').wrap(result, 0, 0, true);
            expect(result).toEqual(['  abc', ' def']);
          });

          it('keep indentation in new lines with spaces', () => {
            const result: Array<string> = [];
            new AnsiString([], 2).split('abc\n\ndef').wrap(result, 0, 0, true);
            expect(result).toEqual(['  abc', '\n', '\n', '  def']);
          });
        });
      });

      describe('emitting styles', () => {
        const str = new AnsiString(bold).split('abc def');

        it('emit styles with move sequences', () => {
          const result: Array<string> = [];
          str.wrap(result, 0, 0, true, false);
          expect(result).toEqual([boldStr + 'abc', ' def', notBoldStr]);
        });

        it('emit styles with spaces', () => {
          const result: Array<string> = [];
          str.wrap(result, 0, 0, true);
          expect(result).toEqual([boldStr + 'abc', ' def', notBoldStr]);
        });
      });

      describe('right-aligned', () => {
        it('do not align when breaking the line', () => {
          const result: Array<string> = [];
          new AnsiString([], 0, 'right').append('abc').break().wrap(result);
          expect(result).toEqual(['abc', '\n']);
        });
      });
    });

    describe('a width is provided', () => {
      it('wrap the text', () => {
        const result: Array<string> = [];
        new AnsiString([], 0, 'left', 8).split('abc largest').wrap(result);
        expect(result).toEqual(['abc', '\n', 'largest']);
      });

      it('preserve line breaks', () => {
        const result: Array<string> = [];
        new AnsiString([], 0, 'left', 8).split('abc\n\nlargest').wrap(result);
        expect(result).toEqual(['abc', '\n', '\n', 'largest']);
      });

      it('preserve emojis', () => {
        const result: Array<string> = [];
        new AnsiString([], 0, 'left', 8).split('⚠️ largest').wrap(result);
        expect(result).toEqual(['⚠️', '\n', 'largest']);
      });

      it('omit styles', () => {
        const result: Array<string> = [];
        new AnsiString(bold, 0, 'left', 8).split('abc largest').wrap(result);
        expect(result).toEqual(['abc', '\n', 'largest']);
      });

      it('wrap merged words', () => {
        const result: Array<string> = [];
        new AnsiString([], 0, 'left', 12).open('[').split('abc largest').close(']').wrap(result);
        expect(result).toEqual(['[abc', '\n', 'largest]']);
      });

      describe('the current column is not zero', () => {
        it('add a line break when the largest word does not fit the configured width', () => {
          const result: Array<string> = [];
          new AnsiString([], 0, 'left', 5).split('abc largest').wrap(result, 2);
          expect(result).toEqual(['\n', 'abc', '\n', 'largest']);
        });

        it('add a line break when the largest word does not fit the terminal width', () => {
          const result: Array<string> = [];
          new AnsiString([], 0, 'left', 10).split('abc largest').wrap(result, 2, 5);
          expect(result).toEqual(['\n', 'abc', '\n', 'largest']);
        });

        it('avoid adding a line break when the largest word does not fit, if the string starts with a line break', () => {
          const result: Array<string> = [];
          new AnsiString([], 0, 'left', 5).break().split('abc largest').wrap(result, 2);
          expect(result).toEqual(['\n', 'abc', '\n', 'largest']);
        });

        it('add a line break when a merged word does not fit the width', () => {
          const result: Array<string> = [];
          const str = new AnsiString().append('gest');
          new AnsiString([], 0, 'left', 5).append('abc').open('lar').append(str).wrap(result, 2);
          expect(result).toEqual(['\n', 'abc', '\n', 'largest']);
        });

        it('add a line break when a word does not fit the width', () => {
          const result: Array<string> = [];
          new AnsiString([], 0, 'left', 5).append('word').wrap(result, 2);
          expect(result).toEqual(['\n', 'word']);
        });

        it('avoid adding a line break when a word fits the width', () => {
          const result: Array<string> = [];
          new AnsiString([], 0, 'left', 8).append('word').wrap(result, 2);
          expect(result).toEqual([' word']);
        });
      });

      describe('the starting column is not zero', () => {
        it('adjust the current line with indentation if the largest word fits', () => {
          const result: Array<string> = [];
          new AnsiString([], 1, 'left', 8).split('abc largest').wrap(result);
          expect(result).toEqual([' abc', '\n', ' largest']);
        });

        it('keep indentation in new lines if the largest word fits', () => {
          const result: Array<string> = [];
          new AnsiString([], 1, 'left', 8).split('abc\n\nlargest').wrap(result);
          expect(result).toEqual([' abc', '\n', '\n', ' largest']);
        });

        it('keep indentation in wrapped lines if the largest word fits', () => {
          const result: Array<string> = [];
          new AnsiString([], 1, 'left', 8).split('abc largest').wrap(result);
          expect(result).toEqual([' abc', '\n', ' largest']);
        });

        it('avoid keeping indentation when the largest word does not fit', () => {
          const result: Array<string> = [];
          new AnsiString([], 1, 'left', 5).split('abc largest').wrap(result);
          expect(result).toEqual(['abc', '\n', 'largest']);
        });

        describe('the current column is not zero', () => {
          it('add a line break when a word does not fit the width', () => {
            const result: Array<string> = [];
            new AnsiString([], 2, 'left', 6).append('word').wrap(result, 4);
            expect(result).toEqual(['\n', '  word']);
          });

          it('avoid adding a line break when a word fits the width', () => {
            const result: Array<string> = [];
            new AnsiString([], 2, 'left', 6).append('word').wrap(result, 3);
            expect(result).toEqual([' word']);
          });
        });

        describe('emitting styles', () => {
          it('keep indentation in wrapped lines with a move sequence', () => {
            const result: Array<string> = [];
            new AnsiString([], 1).split('abc largest').wrap(result, 0, 8, true, false);
            expect(result).toEqual([moveFwd1 + 'abc', '\n', moveFwd1 + 'largest']);
          });

          it('keep indentation in wrapped lines with spaces', () => {
            const result: Array<string> = [];
            new AnsiString([], 1).split('abc largest').wrap(result, 0, 8, true);
            expect(result).toEqual([' abc', '\n', ' largest']);
          });
        });
      });

      describe('right-aligned', () => {
        it('align with spaces when breaking the line', () => {
          const result: Array<string> = [];
          new AnsiString([], 0, 'right', 8).append('abc').break().wrap(result);
          expect(result).toEqual(['     ', 'abc', '\n']);
        });

        it('align with spaces when wrapping the line', () => {
          const result: Array<string> = [];
          new AnsiString([], 0, 'right', 8).split('type script').wrap(result);
          expect(result).toEqual(['    ', 'type', '\n', '  ', 'script']);
        });

        describe('the starting column and current column are not zero', () => {
          it('align when the largest word does not fit ', () => {
            const result: Array<string> = [];
            new AnsiString([], 1, 'right', 5).split('abc largest').wrap(result, 2);
            expect(result).toEqual(['\n', '   ', 'abc', '\n', 'largest']);
          });
        });

        describe('emitting styles', () => {
          it('align with a move sequence when breaking the line', () => {
            const result: Array<string> = [];
            new AnsiString([], 0, 'right').append('abc').break().wrap(result, 0, 8, true, false);
            expect(result).toEqual(['' + moveFwd5, 'abc', '\n']);
          });

          it('align with a move sequence when wrapping the line', () => {
            const result: Array<string> = [];
            new AnsiString([], 0, 'right').split('type script').wrap(result, 0, 8, true, false);
            expect(result).toEqual(['' + moveFwd4, 'type', '\n', '' + moveFwd2, 'script']);
          });

          it('align with spaces when breaking the line', () => {
            const result: Array<string> = [];
            new AnsiString([], 0, 'right').append('abc').break().wrap(result, 0, 8, true);
            expect(result).toEqual(['     ', 'abc', '\n']);
          });

          it('align with spaces when wrapping the line', () => {
            const result: Array<string> = [];
            new AnsiString([], 0, 'right').split('type script').wrap(result, 0, 8, true);
            expect(result).toEqual(['    ', 'type', '\n', '  ', 'script']);
          });
        });
      });
    });
  });
});
