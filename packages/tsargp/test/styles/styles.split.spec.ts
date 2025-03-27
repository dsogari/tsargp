import { describe, expect, it, jest } from 'bun:test';
import { AnsiString, tf, style } from '../../src/library';

const bold = style(tf.bold);

describe('AnsiString', () => {
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
      expect(str.strings).toEqual(['type', 'script', '', '', 'is', 'fun']);
      expect(str.styled).toEqual(['type', 'script', '', '', 'is', 'fun']);
    });

    it('split text with list items', () => {
      const str = new AnsiString().split('type:\n- script\n1. is fun');
      expect(str.strings).toEqual(['type:', '', '-', 'script', '', '1.', 'is', 'fun']);
      expect(str.styled).toEqual(['type:', '', '-', 'script', '', '1.', 'is', 'fun']);
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
        expect(str.styled).toEqual(['-', 'item', '', '*', 'item', '', '1.', 'item']);
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
});
