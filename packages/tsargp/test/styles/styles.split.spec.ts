import { describe, expect, it, jest } from 'bun:test';
import { AnsiString } from '../../src/library';

const boldStr = '\x1b[1m';

describe('AnsiString', () => {
  describe('split', () => {
    it('split text with emojis', () => {
      const str = new AnsiString().split(`⚠️ type script`);
      expect(str.words).toEqual([['⚠️'], ['type'], ['script']]);
    });

    it('split text with inline styles', () => {
      const str = new AnsiString().split(`${boldStr}type ${boldStr} script${boldStr}`);
      expect(str.words).toEqual([['type'], ['script']]);
    });

    it('split text with paragraphs', () => {
      const str = new AnsiString().split('type\nscript\n\nis\nfun');
      expect(str.words).toEqual([['type'], ['script'], [], [], ['is'], ['fun']]);
    });

    it('split text with list items', () => {
      const str = new AnsiString().split('type:\n- script\n1. is fun');
      expect(str.words).toEqual([['type:'], [], ['-'], ['script'], [], ['1.'], ['is'], ['fun']]);
    });

    describe('using placeholders', () => {
      it('insert text at the placeholder location', () => {
        const format = jest.fn(function (this: AnsiString) {
          this.append('abc');
        });
        const str = new AnsiString().split('[#0 script is #1]', format);
        expect(str.words).toEqual([['[', 'abc'], ['script'], ['is'], ['abc', ']']]);
        expect(format).toHaveBeenCalledTimes(2);
        expect(format).toHaveBeenCalledWith('#0');
        expect(format).toHaveBeenCalledWith('#1');
      });

      it('avoid adding a line break to the first list item', () => {
        const format = jest.fn(function (this: AnsiString) {
          this.split('- item\n* item\n1. item');
        });
        const str = new AnsiString().split('#0', format);
        expect(str.words).toEqual([['-'], ['item'], [], ['*'], ['item'], [], ['1.'], ['item']]);
        expect(format).toHaveBeenCalledTimes(1);
        expect(format).toHaveBeenCalledWith('#0');
      });

      it('avoid merging the last word with the next word when not inserting text', () => {
        const format = jest.fn();
        const str = new AnsiString().append('type').split('#0#0', format).append('script');
        expect(str.words).toEqual([['type'], ['script']]);
        expect(format).toHaveBeenCalledTimes(2);
        expect(format).toHaveBeenCalledWith('#0');
      });
    });

    it('remove inline styles', () => {
      const format = jest.fn(function (this: AnsiString) {
        this.append('abc');
      });
      const str = new AnsiString().split(`${boldStr}#0 is #1${boldStr}`, format);
      expect(str.words).toEqual([['abc'], ['is'], ['abc']]);
      expect(format).toHaveBeenCalledTimes(2);
      expect(format).toHaveBeenCalledWith('#0');
      expect(format).toHaveBeenCalledWith('#1');
    });
  });
});
