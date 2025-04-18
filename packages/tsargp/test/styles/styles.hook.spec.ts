import { describe, expect, it } from 'bun:test';
import { AnsiString, tf } from '../../src/library';

const bold = [tf.bold];

const clearStr = '\x1b[0m';
const boldStr = '\x1b[1m';
const clearAndBoldStr = '\x1b[0;1m';
const notBoldStr = '\x1b[22m';

describe('AnsiString', () => {
  describe('wrap', () => {
    describe('left-aligned', () => {
      describe('when the head is the only string', () => {
        it('throw an error when the largest word does not fit the configured width', () => {
          const result: Array<string> = [];
          const str = new AnsiString([], 2, 'left', 4).split('type script');
          str.hook = new AnsiString(); // tail
          expect(() => str.wrap(result)).toThrow('Cannot wrap word of length 6');
        });

        it('wrap multiple lines with indentation', () => {
          const result: Array<string> = [];
          const str = new AnsiString([], 2, 'left', 6).split('type script is fun');
          str.hook = new AnsiString(); // tail
          str.wrap(result);
          expect(result).toEqual(['  type', '\n', '  script', '\n', '  is', ' fun']);
        });
      });

      describe('when the head has more lines than the rest', () => {
        it('wrap a column that has the first line but not the second', () => {
          const result: Array<string> = [];
          const str = new AnsiString([], 2, 'left', 6).split('type script is fun');
          str.hook = new AnsiString([], 10, 'left', 6).split('type script').break(); // feed ignored
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
          const str = new AnsiString([], 2, 'left', 6).split('type script is fun');
          str.hook = new AnsiString([], 10, 'left', 6).break().split('type script');
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
          const str = new AnsiString([], 2, 'left', 6).split('type script').break(); // feed ignored
          str.hook = new AnsiString([], 10, 'left', 6).split('type script is fun');
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
          const str = new AnsiString([], 2, 'left', 6).break().split('type script');
          str.hook = new AnsiString([], 10, 'left', 6).split('type script is fun');
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
          const str = new AnsiString([], 2, 'left', 6).split('type script').break(); // feed ignored
          str.hook = new AnsiString([], 10, 'left', 6).split('type script is fun');
          str.hook.hook = new AnsiString([], 18, 'left', 6).split('type script').break(); // feed ignored
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
          const str = new AnsiString([], 2, 'left', 6).break().split('type script');
          str.hook = new AnsiString([], 10, 'left', 6).split('type script is fun');
          str.hook.hook = new AnsiString([], 18, 'left', 6).break().split('type script');
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
          const str = new AnsiString([], 2, 'left', 6).split('type script is fun');
          str.hook = new AnsiString([], 10, 'left', 6).split('type script').break(); // feed ignored
          str.hook.hook = new AnsiString([], 18, 'left', 6).split('type script is fun');
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
          const str = new AnsiString([], 2, 'left', 6).split('type script is fun');
          str.hook = new AnsiString([], 10, 'left', 6).break().split('type script');
          str.hook.hook = new AnsiString([], 18, 'left', 6).split('type script is fun');
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

        it('wrap a column that has a difference of two lines from the next', () => {
          const result: Array<string> = [];
          const str = new AnsiString([], 2, 'left', 6).split('type script is fun');
          str.hook = new AnsiString([], 10, 'left', 6).append('type').break(); // feed ignored
          str.hook.hook = new AnsiString([], 18, 'left', 6).split('type script is fun');
          str.hook.hook.hook = new AnsiString(); // tail
          str.wrap(result);
          expect(result).toEqual([
            '  type',
            '    type',
            '    type',
            '\n',
            '  script',
            '          script',
            '\n',
            '  is',
            ' fun',
            '          is',
            ' fun',
          ]);
        });

        it('wrap a column that has a missing line in the middle', () => {
          const result: Array<string> = [];
          const str = new AnsiString([], 2, 'left', 6).split('type script is fun');
          str.hook = new AnsiString([], 10, 'left', 6).break().append('type').break(); // feed ignored
          str.hook.hook = new AnsiString([], 18, 'left', 6).split('type script is fun');
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
            '          is',
            ' fun',
          ]);
        });
      });
    });

    describe('right-aligned', () => {
      describe('when the head is the only string', () => {
        it('wrap multiple lines with indentation', () => {
          const result: Array<string> = [];
          const str = new AnsiString([], 2, 'right', 6).split('type script is fun');
          str.hook = new AnsiString(); // tail
          str.wrap(result);
          expect(result).toEqual(['  ', '  type', '\n', '  script', '\n', '  is', ' fun']);
        });
      });

      describe('when the head has more lines than the rest', () => {
        it('wrap a column that has the first line but not the second', () => {
          const result: Array<string> = [];
          const str = new AnsiString([], 2, 'right', 6).split('type script is fun');
          str.hook = new AnsiString([], 10, 'right', 6).split('type script').break(); // feed ignored
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
          const str = new AnsiString([], 2, 'right', 6).split('type script is fun');
          str.hook = new AnsiString([], 10, 'right', 6).break().split('type script');
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
          const str = new AnsiString([], 2, 'right', 6).split('type script').break(); // feed ignored
          str.hook = new AnsiString([], 10, 'right', 6).split('type script is fun');
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
          const str = new AnsiString([], 2, 'right', 6).break().split('type script');
          str.hook = new AnsiString([], 10, 'right', 6).split('type script is fun');
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
          const str = new AnsiString([], 2, 'right', 6).split('type script').break(); // feed ignored
          str.hook = new AnsiString([], 10, 'right', 6).split('type script is fun');
          str.hook.hook = new AnsiString([], 18, 'right', 6).split('type script').break(); // feed ignored
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
          const str = new AnsiString([], 2, 'right', 6).break().split('type script');
          str.hook = new AnsiString([], 10, 'right', 6).split('type script is fun');
          str.hook.hook = new AnsiString([], 18, 'right', 6).break().split('type script');
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
          const str = new AnsiString([], 2, 'right', 6).split('type script is fun');
          str.hook = new AnsiString([], 10, 'right', 6).split('type script').break(); // feed ignored
          str.hook.hook = new AnsiString([], 18, 'right', 6).split('type script sucks');
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
            ' ',
            '          sucks',
          ]);
        });

        it('wrap a column that has the second line but not the first', () => {
          const result: Array<string> = [];
          const str = new AnsiString([], 2, 'right', 6).split('type script is fun');
          str.hook = new AnsiString([], 10, 'right', 6).break().split('type script');
          str.hook.hook = new AnsiString([], 18, 'right', 6).split('type script sucks');
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
            ' ',
            '  sucks',
          ]);
        });

        it('wrap a column that has a difference of two lines from the next', () => {
          const result: Array<string> = [];
          const str = new AnsiString([], 2, 'right', 6).split('type script is fun');
          str.hook = new AnsiString([], 10, 'right', 6).append('type').break(); // feed ignored
          str.hook.hook = new AnsiString([], 18, 'right', 6).split('type script sucks');
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
            '          script',
            '\n',
            '  is',
            ' fun',
            ' ',
            '          sucks',
          ]);
        });

        it('wrap a column that has a missing line in the middle', () => {
          const result: Array<string> = [];
          const str = new AnsiString([], 2, 'right', 6).split('type script is fun');
          str.hook = new AnsiString([], 10, 'right', 6).break().append('type').break(); // feed ignored
          str.hook.hook = new AnsiString([], 18, 'right', 6).split('type script sucks');
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
            ' ',
            '          sucks',
          ]);
        });
      });
    });

    describe('emitting styles', () => {
      it('wrap columns with styles', () => {
        const result: Array<string> = [];
        const str1 = new AnsiString(bold).split('type script');
        const str = new AnsiString([], 2, 'left', 6).append(str1).split('is fun');
        str.hook = new AnsiString([], 10, 'left', 6).split('type script is fun');
        str.hook.hook = new AnsiString(); // tail
        str.wrap(result, 0, 1, true); // should ignore the terminal width
        expect(result).toEqual([
          '  ' + clearStr + boldStr + 'type', // bold style is "glued" to the first word
          '    ' + clearStr + 'type',
          '\n',
          '  ' + clearAndBoldStr + 'script' + notBoldStr,
          '  ' + clearStr + 'script',
          '\n',
          '  ' + clearStr + 'is',
          ' fun',
          '  ' + clearStr + 'is',
          ' fun',
        ]);
      });
    });
  });
});
