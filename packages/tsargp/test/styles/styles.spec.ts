import { describe, expect, it } from 'bun:test';
import { AnsiString, fg, bg, tf, ul, ext8, rgb, config } from '../../src/library';
import { rs } from '../../src/library/enums';

const bold = [tf.bold];
const noColor = [rs.defaultForeground];

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
      const str = new AnsiString()
        .break()
        .append('type')
        .append('is')
        .break()
        .append('script')
        .break();
      expect(str.lineWidth).toEqual(7);
    });

    it('compute maximum line width when closing words', () => {
      const str = new AnsiString().break().append('type').close(',').append('script');
      expect(str.lineWidth).toEqual(12);
    });
  });

  describe('word', () => {
    it('add a word with style and reset the style', () => {
      const sty = [fg.extended, ext8(0), bg.extended, ext8(0), ul.extended, rgb(0, 0, 0)];
      const rst = [rs.defaultForeground, rs.defaultBackground, rs.defaultUnderline];
      const str = new AnsiString().word('type', sty);
      expect(str.words).toEqual([[sty, 'type', rst]]);
    });
  });

  describe('open', () => {
    it('add an opening delimiter to the next word', () => {
      const str = new AnsiString().open('[').open('"').append('type');
      expect(str.words).toEqual([['[', '"', 'type']]);
    });

    it('avoid merging the previous word with the next word if the delimiter is empty', () => {
      const str = new AnsiString().append('type').open('').append('script');
      expect(str.words).toEqual([['type'], ['script']]);
    });

    it('add an opening delimiter at a specific position', () => {
      const str = new AnsiString().openAt('"', 0).append('type').openAt('[', 0);
      expect(str.words).toEqual([['[', '"', 'type']]);
    });

    it('avoid merging with the next string if it is a line feed', () => {
      const str = new AnsiString().open('type').break().append(']');
      expect(str.words).toEqual([['type'], [], [']']]);
    });
  });

  describe('close', () => {
    it('add a closing delimiter when there are no internal strings', () => {
      const str = new AnsiString().close(']');
      expect(str.words).toEqual([[']']]);
    });

    it('add a closing delimiter when there are previous words', () => {
      const str = new AnsiString().append('type').close(']');
      expect(str.words).toEqual([['type', ']']]);
    });

    it('add a closing delimiter to the last internal string', () => {
      const str = new AnsiString().append('type').close(']').close('.');
      expect(str.words).toEqual([['type', ']', '.']]);
    });

    it('avoid merging with the next word if the delimiter is empty', () => {
      const str = new AnsiString().append('type').close('').append('script');
      expect(str.words).toEqual([['type'], ['script']]);
    });

    it('avoid merging with the last string if it is a line feed', () => {
      const str = new AnsiString().append('type').break().close(']');
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
        .value(new AnsiString().append('type').append('script'))
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

  describe('toString', () => {
    it('separates words with spaces and does not emit line feeds or control sequences', () => {
      const str = new AnsiString(bold).break().append('type').append('script');
      expect('' + str).toEqual(' type script');
    });
  });
});
