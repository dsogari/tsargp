import { describe, expect, it } from 'bun:test';
import { AnsiString, fg, bg, tf, ul, ext8, rgb } from '../../src/library';
import { rs } from '../../src/library/enums';

const bold = [tf.bold];

describe('AnsiString', () => {
  describe('break', () => {
    it('avoid merging consecutive line feeds', () => {
      const str = new AnsiString().break(2).break();
      expect(str.words).toEqual([[], [], []]);
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

  describe('toString', () => {
    it('separate words with spaces and avoid emitting line feeds or styles', () => {
      const str = new AnsiString(bold).break().append('type').append('script');
      expect('' + str).toEqual(' type script');
    });
  });
});
