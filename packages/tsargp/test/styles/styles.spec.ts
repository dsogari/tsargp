import { describe, expect, it } from 'bun:test';
import { AnsiString, fg, bg, tf, ul, ext8, rgb, style } from '../../src/library';

const clr = style(tf.clear);
const bold = style(tf.bold);

describe('AnsiString', () => {
  describe('break', () => {
    it('avoid merging consecutive line feeds', () => {
      const str = new AnsiString().break(2).break();
      expect(str.strings).toEqual(['', '', '']);
      expect(str.styled).toEqual(['', '', '']);
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

    it('avoid merging with the next string if it is a line feed', () => {
      const str = new AnsiString().open('type').break().word(']');
      expect(str.strings).toEqual(['type', '', ']']);
      expect(str.styled).toEqual(['type', '', ']']);
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
        expect(str2.styled).toEqual(['type', '', 'script']);
      });

      it('merge the endpoint strings if the merge flag is set in the self string', () => {
        const str1 = new AnsiString().word('type').word('script');
        const str2 = new AnsiString().open('[').other(str1).close(']');
        expect(str2.strings).toEqual(['[type', 'script]']);
        expect(str2.styled).toEqual(['[type', 'script]']);
      });

      it('merge the endpoint strings if the merge flag is set in the other string', () => {
        const str1 = new AnsiString();
        str1.merge = true;
        str1.word('type').word('script');
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

    it('avoid merging with the last string if it is a line feed', () => {
      const str = new AnsiString().word('type').break().close(']');
      expect(str.strings).toEqual(['type', '', ']']);
      expect(str.styled).toEqual(['type', '', ']']);
    });
  });

  describe('closeSty', () => {
    it('open with style when there are no strings', () => {
      const str = new AnsiString().closeSty(clr).word('type');
      expect(str.strings).toEqual(['type']);
      expect(str.styled).toEqual([clr + 'type']);
    });

    it('close with style when there is a string', () => {
      const str = new AnsiString().word('type').closeSty(clr);
      expect(str.strings).toEqual(['type']);
      expect(str.styled).toEqual(['type' + clr]);
    });

    it('do not close with style when the last string is a line feed', () => {
      const str = new AnsiString().word('type').break().closeSty(clr).word('script');
      expect(str.strings).toEqual(['type', '', 'script']);
      expect(str.styled).toEqual(['type', '', clr + 'script']);
    });
  });

  describe('pushSty and popSty', () => {
    it('preserve order of pushed styles', () => {
      const extended = style(fg.extended, ext8(0));
      const boldAndExtended = style(tf.bold, fg.extended, ext8(0));
      const cancelExtended = style(fg.default);
      const str = new AnsiString()
        .popSty() // does nothing
        .word('type')
        .pushSty(clr)
        .word('script')
        .pushSty(boldAndExtended)
        .word('is')
        .pushSty(cancelExtended)
        .word('a')
        .popSty() // should reapply extended, but not bold
        .word('lot')
        .popSty() // should clear all preceding attributes
        .word('of')
        .popSty() // clear needs no cancelling
        .word('fun')
        .popSty(); // does nothing
      expect(str.strings).toEqual(['type', 'script', 'is', 'a', 'lot', 'of', 'fun']);
      expect(str.styled).toEqual([
        'type',
        clr + 'script',
        boldAndExtended + 'is',
        cancelExtended + 'a' + extended,
        'lot' + clr,
        'of',
        'fun',
      ]);
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
      expect(str.strings).toEqual([
        'true',
        `'some text'`,
        '123',
        '/def/',
        'some name',
        'https://abc/',
        'type',
        'script',
        '[1,',
        `'a',`,
        'false]',
        `{'0':`,
        `'c',`,
        'a:',
        '1,',
        `'d-':`,
        '/ghi/i}',
        '<()',
        '=>',
        '1>',
        '<undefined>',
      ]);
    });
  });

  describe('append', () => {
    it('append a normal string with splitting', () => {
      const str = new AnsiString().append('type script');
      expect(str.strings).toEqual(['type', 'script']);
    });

    it('append a normal string without splitting', () => {
      const str = new AnsiString().append('type script', false);
      expect(str.strings).toEqual(['type script']);
    });

    it('append a normal string with control sequences without splitting', () => {
      const str = new AnsiString().append(`type ${bold} script`, false);
      expect(str.strings).toEqual(['type  script']);
      expect(str.styled).toEqual(['type ' + bold + ' script']);
    });

    it('append another ANSI string', () => {
      const str = new AnsiString().append(new AnsiString().word('type').word('script'));
      expect(str.strings).toEqual(['type', 'script']);
    });
  });

  describe('toString', () => {
    it('separates words with spaces and does not emit line feeds or control sequences', () => {
      const str = new AnsiString().break().pushSty(bold).word('type').word('script').popSty();
      expect('' + str).toEqual(' type script');
    });
  });
});
