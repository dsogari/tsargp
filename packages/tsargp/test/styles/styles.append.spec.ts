import { describe, expect, it } from 'bun:test';
import { AnsiString, tf } from '../../src/library';
import { rs } from '../../src/library/enums';

const bold = [tf.bold];
const faint = [tf.faint];
const notBold = [rs.notBoldOrFaint];

const boldStr = '\x1b[1m';

describe('AnsiString', () => {
  describe('append', () => {
    describe('when self is empty', () => {
      describe('when other is empty', () => {
        describe('when other is a normal string', () => {
          it('do not change the merge flag', () => {
            const str = new AnsiString();
            str.mergeLast = true;
            str.append('');
            expect(str.words).toEqual([]);
            expect(str.mergeFirst).toBeFalse();
            expect(str.mergeLast).toBeTrue();
            expect(str.wordCount).toEqual(0);
            expect(str.wordWidth).toEqual(0);
            expect(str.lineCount).toEqual(1);
            expect(str.lineWidth).toEqual(0);
          });
        });

        describe('when other is another ANSI string', () => {
          it('do not change the merge flag', () => {
            const str = new AnsiString();
            const str2 = new AnsiString();
            str2.mergeLast = true;
            str.append(str2);
            expect(str.mergeFirst).toBeFalse();
            expect(str.mergeLast).toBeFalse();
            str.mergeLast = true;
            str2.mergeLast = false;
            str.append(str2);
            expect(str.words).toEqual([]);
            expect(str.mergeFirst).toBeFalse();
            expect(str.mergeLast).toBeTrue();
            expect(str.wordCount).toEqual(0);
            expect(str.wordWidth).toEqual(0);
            expect(str.lineCount).toEqual(1);
            expect(str.lineWidth).toEqual(0);
          });
        });
      });

      describe('when other is not empty', () => {
        describe('when other is a normal string', () => {
          it('reset the merge flag and remove inline styles', () => {
            const str = new AnsiString();
            str.mergeLast = true;
            str.append(boldStr + 'abc' + boldStr);
            expect(str.words).toEqual([['abc']]);
            expect(str.mergeFirst).toBeTrue();
            expect(str.mergeLast).toBeFalse();
            expect(str.wordCount).toEqual(1);
            expect(str.wordWidth).toEqual(3);
            expect(str.lineCount).toEqual(1);
            expect(str.lineWidth).toEqual(3);
          });

          it('split the text and remove inline styles', () => {
            const str = new AnsiString().append(boldStr + 'type  script' + boldStr, true);
            expect(str.words).toEqual([['type'], ['script']]);
            expect(str.mergeFirst).toBeFalse();
            expect(str.mergeLast).toBeFalse();
            expect(str.wordCount).toEqual(2);
            expect(str.wordWidth).toEqual(6);
            expect(str.lineCount).toEqual(1);
            expect(str.lineWidth).toEqual(11);
          });

          it('update line count', () => {
            const str = new AnsiString();
            str.mergeLast = true;
            str.break().append('script');
            expect(str.words).toEqual([[], ['script']]);
            expect(str.mergeFirst).toBeFalse();
            expect(str.mergeLast).toBeFalse();
            expect(str.wordCount).toEqual(2);
            expect(str.wordWidth).toEqual(6);
            expect(str.lineCount).toEqual(2);
            expect(str.lineWidth).toEqual(6);
          });

          it('avoid splitting, but remove remove inline styles', () => {
            const str = new AnsiString().append('type  script').append(`type ${boldStr} script`);
            expect(str.words).toEqual([['type  script'], ['type  script']]);
          });
        });

        describe('when other is another ANSI string', () => {
          it('reset the merge flag', () => {
            const str = new AnsiString();
            str.mergeLast = true;
            str.append(new AnsiString().append('abc'));
            expect(str.words).toEqual([['abc']]);
            expect(str.mergeFirst).toBeTrue();
            expect(str.mergeLast).toBeFalse();
            expect(str.wordCount).toEqual(1);
            expect(str.wordWidth).toEqual(3);
            expect(str.lineCount).toEqual(1);
            expect(str.lineWidth).toEqual(3);
          });

          it('update the merge flag', () => {
            const str1 = new AnsiString();
            str1.mergeLast = true;
            str1.append('type script', true);
            str1.mergeLast = true;
            const str = new AnsiString().append(str1);
            expect(str.words).toEqual([['type'], ['script']]);
            expect(str.mergeFirst).toBeTrue();
            expect(str.mergeLast).toBeTrue();
            expect(str.wordCount).toEqual(2);
            expect(str.wordWidth).toEqual(6);
            expect(str.lineCount).toEqual(1);
            expect(str.lineWidth).toEqual(11);
          });

          it('update line count', () => {
            const str1 = new AnsiString().append('type').break().append('script');
            const str = new AnsiString().append(str1);
            expect(str.words).toEqual([['type'], [], ['script']]);
            expect(str.mergeFirst).toBeFalse();
            expect(str.mergeLast).toBeFalse();
            expect(str.wordCount).toEqual(3);
            expect(str.wordWidth).toEqual(6);
            expect(str.lineCount).toEqual(2);
            expect(str.lineWidth).toEqual(6);
          });

          it('reapply the base style from the self string', () => {
            const str1 = new AnsiString(bold).append('type');
            const str = new AnsiString(faint).append(str1);
            expect(str.words).toEqual([[bold, 'type', faint]]);
          });

          it('cancel the base style from the other string', () => {
            const str1 = new AnsiString(bold).append('type');
            const str = new AnsiString().append(str1);
            expect(str.words).toEqual([[bold, 'type', notBold]]);
          });

          it('reapply style from the middle string and cancel it', () => {
            const str2 = new AnsiString(bold).append('type');
            const str1 = new AnsiString(faint).append(str2);
            const str = new AnsiString().append(str1);
            expect(str.words).toEqual([[faint, bold, 'type', faint, notBold]]);
          });

          it('reapply style from the middle string when it is not empty', () => {
            const str2 = new AnsiString(bold).append('type');
            const str1 = new AnsiString(faint).append('abc').append(str2).append('def');
            const str = new AnsiString().append(str1);
            expect(str.words).toEqual([
              [faint, 'abc'],
              [bold, 'type', faint],
              ['def', notBold],
            ]);
          });
        });
      });
    });

    describe('when self is not empty', () => {
      describe('when other is empty', () => {
        describe('when other is a normal string', () => {
          it('do not change the merge flag', () => {
            const str = new AnsiString().append('abc');
            str.mergeLast = true;
            str.append('');
            expect(str.words).toEqual([['abc']]);
            expect(str.mergeFirst).toBeFalse();
            expect(str.mergeLast).toBeTrue();
            expect(str.wordCount).toEqual(1);
            expect(str.wordWidth).toEqual(3);
            expect(str.lineCount).toEqual(1);
            expect(str.lineWidth).toEqual(3);
          });
        });

        describe('when other is another ANSI string', () => {
          it('do not change the merge flag', () => {
            const str = new AnsiString().append('abc');
            const str2 = new AnsiString();
            str2.mergeLast = true;
            str.append(str2);
            expect(str.mergeFirst).toBeFalse();
            expect(str.mergeLast).toBeFalse();
            str.mergeLast = true;
            str2.mergeLast = false;
            str.append(str2);
            expect(str.words).toEqual([['abc']]);
            expect(str.mergeFirst).toBeFalse();
            expect(str.mergeLast).toBeTrue();
            expect(str.wordCount).toEqual(1);
            expect(str.wordWidth).toEqual(3);
            expect(str.lineCount).toEqual(1);
            expect(str.lineWidth).toEqual(3);
          });
        });
      });

      describe('when other is not empty', () => {
        describe('when other is a normal string', () => {
          it('reset the merge flag and remove inline styles', () => {
            const str = new AnsiString().append('abc');
            str.mergeLast = true;
            str.append(boldStr + 'abc' + boldStr);
            expect(str.words).toEqual([['abc', 'abc']]);
            expect(str.mergeFirst).toBeFalse();
            expect(str.mergeLast).toBeFalse();
            expect(str.wordCount).toEqual(1);
            expect(str.wordWidth).toEqual(6);
            expect(str.lineCount).toEqual(1);
            expect(str.lineWidth).toEqual(6);
          });

          it('split the text and remove inline styles', () => {
            const str = new AnsiString()
              .append('abc')
              .append(boldStr + 'type  script' + boldStr, true);
            expect(str.words).toEqual([['abc'], ['type'], ['script']]);
            expect(str.mergeFirst).toBeFalse();
            expect(str.mergeLast).toBeFalse();
            expect(str.wordCount).toEqual(3);
            expect(str.wordWidth).toEqual(6);
            expect(str.lineCount).toEqual(1);
            expect(str.lineWidth).toEqual(15);
          });

          it('update line count', () => {
            const str = new AnsiString().append('type').break().append('script');
            expect(str.words).toEqual([['type'], [], ['script']]);
            expect(str.mergeFirst).toBeFalse();
            expect(str.mergeLast).toBeFalse();
            expect(str.wordCount).toEqual(3);
            expect(str.wordWidth).toEqual(6);
            expect(str.lineCount).toEqual(2);
            expect(str.lineWidth).toEqual(6);
          });
        });

        describe('when other is another ANSI string', () => {
          it('reset the merge flag', () => {
            const str = new AnsiString().append('abc');
            str.mergeLast = true;
            str.append(new AnsiString().append('abc'));
            expect(str.words).toEqual([['abc', 'abc']]);
            expect(str.mergeFirst).toBeFalse();
            expect(str.mergeLast).toBeFalse();
            expect(str.wordCount).toEqual(1);
            expect(str.wordWidth).toEqual(6);
            expect(str.lineCount).toEqual(1);
            expect(str.lineWidth).toEqual(6);
          });

          it('update the merge flag', () => {
            const str1 = new AnsiString();
            str1.mergeLast = true;
            str1.append('type script', true);
            str1.mergeLast = true;
            const str = new AnsiString().append('abc').append(str1);
            expect(str.words).toEqual([['abc', 'type'], ['script']]);
            expect(str.mergeFirst).toBeFalse();
            expect(str.mergeLast).toBeTrue();
            expect(str.wordCount).toEqual(2);
            expect(str.wordWidth).toEqual(7);
            expect(str.lineCount).toEqual(1);
            expect(str.lineWidth).toEqual(14);
          });

          it('update line count', () => {
            const str1 = new AnsiString().append('type').break().append('script');
            const str = new AnsiString().append('abc').append(str1);
            expect(str.words).toEqual([['abc'], ['type'], [], ['script']]);
            expect(str.mergeFirst).toBeFalse();
            expect(str.mergeLast).toBeFalse();
            expect(str.wordCount).toEqual(4);
            expect(str.wordWidth).toEqual(6);
            expect(str.lineCount).toEqual(2);
            expect(str.lineWidth).toEqual(8);
          });
        });
      });
    });
  });
});
