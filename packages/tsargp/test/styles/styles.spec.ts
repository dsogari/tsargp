import { describe, expect, it } from 'bun:test';
import { AnsiString, cs, fg, bg, tf, ul, ext8, rgb, seq, style } from '../../src/library';

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

  describe('value', () => {
    // TODO
  });

  describe('toString', () => {
    it('separates words with spaces and does not emit line feeds or control sequences', () => {
      const str = new AnsiString().break().pushSty(bold).word('type').word('script').popSty();
      expect('' + str).toEqual(' type script');
    });
  });
});
