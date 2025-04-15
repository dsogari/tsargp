import { describe, expect, it } from 'bun:test';
import { AnsiString, fg, bg, tf, ul, ext8, rgb, config } from '../../src/library';
import { rs } from '../../src/library/enums';

const bold = [tf.bold];
const notBold = [rs.notBoldOrFaint];
const noColor = [rs.defaultForeground];

const boldStr = '\x1b[1m';

describe('AnsiString', () => {
  describe('break', () => {
    it('avoid merging consecutive line feeds', () => {
      const str = new AnsiString().break(2).break();
      expect(str.words).toEqual([[], [], []]);
    });
  });

  describe('lineWidth', () => {
    it('return zero if no strings', () => {
      const str = new AnsiString();
      expect(str.lineWidth).toEqual(0);
    });

    it('compute maximum line width among all lines, counting spaces', () => {
      const str = new AnsiString().break().word('type').word('is').break().word('script').break();
      expect(str.lineWidth).toEqual(7);
    });

    it('compute maximum line width when closing words', () => {
      const str = new AnsiString().break().word('type').close(',').word('script');
      expect(str.lineWidth).toEqual(12);
    });
  });

  describe('word', () => {
    it('add words with no style', () => {
      const str = new AnsiString().word('type').word('script');
      expect(str.words).toEqual([['type'], ['script']]);
    });

    it('add a word with style and reset the style', () => {
      const sty = [fg.extended, ext8(0), bg.extended, ext8(0), ul.extended, rgb(0, 0, 0)];
      const rst = [rs.defaultForeground, rs.defaultBackground, rs.defaultUnderline];
      const str = new AnsiString().word('type', sty);
      expect(str.words).toEqual([[sty, 'type', rst]]);
    });
  });

  describe('open', () => {
    it('add an opening delimiter to the next word', () => {
      const str = new AnsiString().open('[').open('"').word('type');
      expect(str.words).toEqual([['[', '"', 'type']]);
    });

    it('avoid merging the previous word with the next word if the delimiter is empty', () => {
      const str = new AnsiString().word('type').open('').word('script');
      expect(str.words).toEqual([['type'], ['script']]);
    });

    it('add an opening delimiter at a specific position', () => {
      const str = new AnsiString().openAt('"', 0).word('type').openAt('[', 0);
      expect(str.words).toEqual([['[', '"', 'type']]);
    });

    it('avoid merging with the next string if it is a line feed', () => {
      const str = new AnsiString().open('type').break().word(']');
      expect(str.words).toEqual([['type'], [], [']']]);
    });
  });

  describe('add', () => {
    describe('when the self string is empty', () => {
      it('if the merge flag is set on the self string', () => {
        const str1 = new AnsiString().word('type');
        const str2 = new AnsiString();
        str2.mergeLast = true;
        str2.append(str1);
        expect(str2.words).toEqual([['type']]);
      });

      it('if the merge flag is set on the other string', () => {
        const str1 = new AnsiString();
        str1.mergeLast = true;
        str1.word('type');
        const str2 = new AnsiString().append(str1);
        expect(str2.words).toEqual([['type']]);
      });

      it('preserve the merge flag from the other string', () => {
        const str1 = new AnsiString().word('type');
        str1.mergeLast = true;
        const str2 = new AnsiString().append(str1).word(']');
        expect(str2.words).toEqual([['type', ']']]);
      });

      it('preserve the max length from the other string', () => {
        const str1 = new AnsiString().word('type');
        const str2 = new AnsiString().append(str1);
        expect(str2.maxLength).toEqual(4);
      });
    });

    describe('when the self string is not empty', () => {
      it('keep current style if the merge flag is set in the self string', () => {
        const str1 = new AnsiString(bold).word('type');
        const str2 = new AnsiString().word('[');
        str2.mergeLast = true;
        str2.append(str1);
        expect(str2.words).toEqual([['[', bold, 'type', notBold]]);
      });

      it('keep current style if the merge flag is set in the other string', () => {
        const str1 = new AnsiString(bold);
        str1.mergeLast = true;
        str1.word('type');
        const str2 = new AnsiString().word('[').append(str1);
        expect(str2.words).toEqual([['[', bold, 'type', notBold]]);
      });

      it('preserve the merge flag from the other string', () => {
        const str1 = new AnsiString().word('script');
        str1.mergeLast = true;
        const str2 = new AnsiString().word('type').append(str1).word(']');
        expect(str2.words).toEqual([['type'], ['script', ']']]);
      });

      it('update the max length combined with the other string', () => {
        const str1 = new AnsiString().word('script');
        const str2 = new AnsiString().word('type').append(str1);
        expect(str2.maxLength).toEqual(6);
      });
    });

    describe('when the other string is empty', () => {
      it('preserve the merge flag from the other string', () => {
        const str1 = new AnsiString();
        str1.mergeLast = true;
        const str2 = new AnsiString().word('type').append(str1).word(']');
        expect(str2.words).toEqual([['type', ']']]);
      });
    });

    describe('when neither string is empty', () => {
      it('merge line feed from the other string', () => {
        const str1 = new AnsiString().break();
        const str2 = new AnsiString().open('type').append(str1).word('script');
        expect(str2.words).toEqual([['type'], [], ['script']]);
      });

      it('merge the endpoint strings if the merge flag is set in the self string', () => {
        const str1 = new AnsiString().word('type').word('script');
        const str2 = new AnsiString().open('[').append(str1).close(']');
        expect(str2.words).toEqual([
          ['[', 'type'],
          ['script', ']'],
        ]);
      });

      it('merge the endpoint strings if the merge flag is set in the other string', () => {
        const str1 = new AnsiString();
        str1.mergeLast = true;
        str1.word('type').word('script');
        const str2 = new AnsiString().word('[').append(str1);
        expect(str2.words).toEqual([['[', 'type'], ['script']]);
      });

      it('reapply the base style from the self string', () => {
        const faint = [tf.faint];
        const str1 = new AnsiString(bold).word('type');
        const str2 = new AnsiString(faint).append(str1);
        expect(str2.words).toEqual([[bold, 'type', faint]]);
      });

      it('cancel the base style from the other string', () => {
        const str1 = new AnsiString(bold).word('type');
        const str2 = new AnsiString().append(str1);
        expect(str2.words).toEqual([[bold, 'type', notBold]]);
      });
    });
  });

  describe('close', () => {
    it('add a closing delimiter when there are no internal strings', () => {
      const str = new AnsiString().close(']');
      expect(str.words).toEqual([[']']]);
    });

    it('add a closing delimiter when there are previous words', () => {
      const str = new AnsiString().word('type').close(']');
      expect(str.words).toEqual([['type', ']']]);
    });

    it('add a closing delimiter to the last internal string', () => {
      const str = new AnsiString().word('type').close(']').close('.');
      expect(str.words).toEqual([['type', ']', '.']]);
    });

    it('avoid merging with the next word if the delimiter is empty', () => {
      const str = new AnsiString().word('type').close('').word('script');
      expect(str.words).toEqual([['type'], ['script']]);
    });

    it('avoid merging with the last string if it is a line feed', () => {
      const str = new AnsiString().word('type').break().close(']');
      expect(str.words).toEqual([['type'], [], [']']]);
    });
  });

  describe('value', () => {
    it('append values of various kinds', () => {
      const str = new AnsiString()
        .value(true)
        .value('some text')
        .value(123)
        .value(/def/)
        .value(Symbol.for('some name'))
        .value(new URL('https://abc'))
        .value(new AnsiString().word('type').word('script'))
        .value([1, 'a', false])
        .value({ a: 1, 0: 'c', 'd-': /ghi/i })
        .value(() => 1)
        .value(undefined);
      expect(str.words).toEqual([
        [config.styles.boolean, 'true', noColor],
        [config.styles.string, `'some text'`, noColor],
        [config.styles.number, '123', noColor],
        [config.styles.regex, '/def/', noColor],
        [config.styles.symbol, 'some name', noColor],
        [config.styles.url, 'https://abc/', noColor],
        ['type'],
        ['script'],
        ['[', config.styles.number, '1', noColor, ','],
        [config.styles.string, `'a'`, noColor, ','],
        [config.styles.boolean, 'false', noColor, ']'],
        ['{', config.styles.string, `'0'`, noColor, ':'],
        [config.styles.string, `'c'`, noColor, ','],
        [config.styles.symbol, 'a', noColor, ':'],
        [config.styles.number, '1', noColor, ','],
        [config.styles.string, `'d-'`, noColor, ':'],
        [config.styles.regex, '/ghi/i', noColor, '}'],
        [config.styles.value, '<', '()'],
        ['=>'],
        ['1', '>', noColor],
        [config.styles.value, '<', 'undefined', '>', noColor],
      ]);
    });
  });

  describe('append', () => {
    describe('with splitting', () => {
      it('append a string without inline styles', () => {
        const str = new AnsiString().append('type script');
        expect(str.words).toEqual([['type'], ['script']]);
      });

      it('append a string with inline styles', () => {
        const str = new AnsiString().append('type ' + boldStr + ' script');
        expect(str.words).toEqual([['type'], ['script']]);
      });
    });

    describe('without splitting', () => {
      it('append a string without inline styles', () => {
        const str = new AnsiString().append('type  script', false);
        expect(str.words).toEqual([['type  script']]);
      });

      it('append a string with inline styles', () => {
        const str = new AnsiString().append('type ' + boldStr + ' script', false);
        expect(str.words).toEqual([['type  script']]);
      });
    });

    it('append another ANSI string', () => {
      const str = new AnsiString().append(new AnsiString().word('type').word('script'));
      expect(str.words).toEqual([['type'], ['script']]);
    });
  });

  describe('toString', () => {
    it('separates words with spaces and does not emit line feeds or control sequences', () => {
      const str = new AnsiString(bold).break().word('type').word('script');
      expect('' + str).toEqual(' type script');
    });
  });
});
