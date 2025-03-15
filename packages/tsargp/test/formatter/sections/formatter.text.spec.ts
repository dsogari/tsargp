import { describe, expect, it } from 'bun:test';
import type { HelpSections } from '../../../src/library';
import { format, style, tf } from '../../../src/library';

describe('rendering a text section', () => {
  it('skip a section with no heading and no content', () => {
    const sections: HelpSections = [{ type: 'text' }];
    expect(format({}, sections).wrap()).toEqual('');
  });

  describe('rendering the section heading', () => {
    it('avoid braking the heading with text', () => {
      const sections: HelpSections = [{ type: 'text', heading: { text: 'text' } }];
      expect(format({}, sections).wrap()).toEqual('text');
    });

    it('break the heading with no text', () => {
      const sections: HelpSections = [{ type: 'text', heading: { breaks: 1 } }];
      expect(format({}, sections).wrap()).toEqual('\n');
    });

    it('break the heading with text', () => {
      const sections: HelpSections = [{ type: 'text', heading: { text: 'text', breaks: 1 } }];
      expect(format({}, sections).wrap()).toEqual('\ntext');
    });

    it('avoid breaking the heading with no text at the beginning of the message', () => {
      const sections: HelpSections = [{ type: 'text', heading: { breaks: 1, noBreakFirst: true } }];
      expect(format({}, sections).wrap()).toEqual('');
    });

    it('avoid breaking the heading with text at the beginning of the message', () => {
      const sections: HelpSections = [
        { type: 'text', heading: { text: 'text', breaks: 1, noBreakFirst: true } },
      ];
      expect(format({}, sections).wrap()).toEqual('text');
    });

    it('indent the heading with text', () => {
      const sections: HelpSections = [{ type: 'text', heading: { text: 'text', indent: 2 } }];
      expect(format({}, sections).wrap()).toEqual('  text');
    });

    it('right-align the heading with text', () => {
      const sections: HelpSections = [{ type: 'text', heading: { text: 'text', align: 'right' } }];
      expect(format({}, sections).wrap(10, false, true)).toEqual('      text');
    });

    it('avoid splitting the heading with text', () => {
      const sections: HelpSections = [
        { type: 'text', heading: { text: `text ${style(tf.clear)} spaces`, noSplit: true } },
      ];
      expect(format({}, sections).wrap()).toEqual('text  spaces');
    });
  });

  describe('rendering the section content', () => {
    it('avoid breaking the content with text, but include a trailing break', () => {
      const sections: HelpSections = [{ type: 'text', content: { text: 'text' } }];
      expect(format({}, sections).wrap()).toEqual('text\n');
    });

    it('break the content with no text, but do not include a trailing break', () => {
      const sections: HelpSections = [{ type: 'text', content: { breaks: 1 } }];
      expect(format({}, sections).wrap()).toEqual('\n');
    });

    it('break the content with text, and include a trailing break', () => {
      const sections: HelpSections = [{ type: 'text', content: { text: 'text', breaks: 1 } }];
      expect(format({}, sections).wrap()).toEqual('\ntext\n');
    });

    it('avoid breaking the content with no text at the beginning of the message', () => {
      const sections: HelpSections = [{ type: 'text', content: { breaks: 1, noBreakFirst: true } }];
      expect(format({}, sections).wrap()).toEqual('');
    });

    it('avoid breaking the content with text at the beginning of the message', () => {
      const sections: HelpSections = [
        { type: 'text', content: { text: 'text', breaks: 1, noBreakFirst: true } },
      ];
      expect(format({}, sections).wrap()).toEqual('text\n');
    });

    it('indent the content with text, and include a trailing break', () => {
      const sections: HelpSections = [{ type: 'text', content: { text: 'text', indent: 2 } }];
      expect(format({}, sections).wrap()).toEqual('  text\n');
    });

    it('right-align the content with text, and include a trailing break', () => {
      const sections: HelpSections = [{ type: 'text', content: { text: 'text', align: 'right' } }];
      expect(format({}, sections).wrap(10, false, true)).toEqual('      text\n');
    });

    it('avoid splitting the content with text, but include a trailing break', () => {
      const sections: HelpSections = [
        { type: 'text', content: { text: `text ${style(tf.clear)} spaces`, noSplit: true } },
      ];
      expect(format({}, sections).wrap()).toEqual('text  spaces\n');
    });
  });
});
