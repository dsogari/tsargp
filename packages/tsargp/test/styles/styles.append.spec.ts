import { describe, expect, it } from 'bun:test';
import { AnsiString, tf } from '../../src/library';
import { rs } from '../../src/library/enums';

const bold = [tf.bold];
const notBold = [rs.notBoldOrFaint];

const boldStr = '\x1b[1m';

describe('AnsiString', () => {
  describe('append', () => {
    describe('when the self string is empty', () => {
      it('if the merge flag is set on the self string', () => {
        const str1 = new AnsiString().append('type');
        const str2 = new AnsiString();
        str2.mergeLast = true;
        str2.append(str1);
        expect(str2.words).toEqual([['type']]);
      });

      it('if the merge flag is set on the other string', () => {
        const str1 = new AnsiString();
        str1.mergeLast = true;
        str1.append('type');
        const str2 = new AnsiString().append(str1);
        expect(str2.words).toEqual([['type']]);
      });

      it('preserve the merge flag from the other string', () => {
        const str1 = new AnsiString().append('type');
        str1.mergeLast = true;
        const str2 = new AnsiString().append(str1).append(']');
        expect(str2.words).toEqual([['type', ']']]);
      });

      it('preserve the max length from the other string', () => {
        const str1 = new AnsiString().append('type');
        const str2 = new AnsiString().append(str1);
        expect(str2.maxLength).toEqual(4);
      });
    });

    describe('when the self string is not empty', () => {
      it('keep current style if the merge flag is set in the self string', () => {
        const str1 = new AnsiString(bold).append('type');
        const str2 = new AnsiString().append('[');
        str2.mergeLast = true;
        str2.append(str1);
        expect(str2.words).toEqual([['[', bold, 'type', notBold]]);
      });

      it('keep current style if the merge flag is set in the other string', () => {
        const str1 = new AnsiString(bold);
        str1.mergeLast = true;
        str1.append('type');
        const str2 = new AnsiString().append('[').append(str1);
        expect(str2.words).toEqual([['[', bold, 'type', notBold]]);
      });

      it('preserve the merge flag from the other string', () => {
        const str1 = new AnsiString().append('script');
        str1.mergeLast = true;
        const str2 = new AnsiString().append('type').append(str1).append(']');
        expect(str2.words).toEqual([['type'], ['script', ']']]);
      });

      it('update the max length combined with the other string', () => {
        const str1 = new AnsiString().append('script');
        const str2 = new AnsiString().append('type').append(str1);
        expect(str2.maxLength).toEqual(6);
      });
    });

    describe('when the other string is empty', () => {
      it('preserve the merge flag from the other string', () => {
        const str1 = new AnsiString();
        str1.mergeLast = true;
        const str2 = new AnsiString().append('type').append(str1).append(']');
        expect(str2.words).toEqual([['type', ']']]);
      });
    });

    describe('when neither string is empty', () => {
      it('merge line feed from the other string', () => {
        const str1 = new AnsiString().break();
        const str2 = new AnsiString().open('type').append(str1).append('script');
        expect(str2.words).toEqual([['type'], [], ['script']]);
      });

      it('merge the endpoint strings if the merge flag is set in the self string', () => {
        const str1 = new AnsiString().append('type').append('script');
        const str2 = new AnsiString().open('[').append(str1).close(']');
        expect(str2.words).toEqual([
          ['[', 'type'],
          ['script', ']'],
        ]);
      });

      it('merge the endpoint strings if the merge flag is set in the other string', () => {
        const str1 = new AnsiString();
        str1.mergeLast = true;
        str1.append('type').append('script');
        const str2 = new AnsiString().append('[').append(str1);
        expect(str2.words).toEqual([['[', 'type'], ['script']]);
      });

      it('reapply the base style from the self string', () => {
        const faint = [tf.faint];
        const str1 = new AnsiString(bold).append('type');
        const str2 = new AnsiString(faint).append(str1);
        expect(str2.words).toEqual([[bold, 'type', faint]]);
      });

      it('cancel the base style from the other string', () => {
        const str1 = new AnsiString(bold).append('type');
        const str2 = new AnsiString().append(str1);
        expect(str2.words).toEqual([[bold, 'type', notBold]]);
      });
    });
  });

  describe('with splitting', () => {
    it('append a string without inline styles', () => {
      const str = new AnsiString().append('type script', true);
      expect(str.words).toEqual([['type'], ['script']]);
    });

    it('append a string with inline styles', () => {
      const str = new AnsiString().append('type ' + boldStr + ' script', true);
      expect(str.words).toEqual([['type'], ['script']]);
    });
  });

  describe('without splitting', () => {
    it('append a string without inline styles', () => {
      const str = new AnsiString().append('type  script');
      expect(str.words).toEqual([['type  script']]);
    });

    it('append a string with inline styles', () => {
      const str = new AnsiString().append('type ' + boldStr + ' script');
      expect(str.words).toEqual([['type  script']]);
    });
  });

  it('append words', () => {
    const str = new AnsiString().append('type').append('script');
    expect(str.words).toEqual([['type'], ['script']]);
  });

  it('append another ANSI string', () => {
    const str1 = new AnsiString().append('type').append('script');
    const str2 = new AnsiString().append(str1);
    expect(str2.words).toEqual([['type'], ['script']]);
  });
});
