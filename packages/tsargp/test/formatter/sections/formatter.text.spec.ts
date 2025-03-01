import { describe, expect, it } from 'bun:test';
import type { HelpSections } from '../../../lib/options';
import { format } from '../../../lib/formatter';
import { style } from '../../../lib/styles';
import { tf } from '../../../lib/enums';

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
    it('avoid braking the content with text', () => {
      const sections: HelpSections = [{ type: 'text', content: { text: 'text' } }];
      expect(format({}, sections).wrap()).toEqual('text');
    });

    it('break the content with no text', () => {
      const sections: HelpSections = [{ type: 'text', content: { breaks: 1 } }];
      expect(format({}, sections).wrap()).toEqual('\n');
    });

    it('break the content with text', () => {
      const sections: HelpSections = [{ type: 'text', content: { text: 'text', breaks: 1 } }];
      expect(format({}, sections).wrap()).toEqual('\ntext');
    });

    it('indent the content with text', () => {
      const sections: HelpSections = [{ type: 'text', content: { text: 'text', indent: 2 } }];
      expect(format({}, sections).wrap()).toEqual('  text');
    });

    it('right-align the content with text', () => {
      const sections: HelpSections = [{ type: 'text', content: { text: 'text', align: 'right' } }];
      expect(format({}, sections).wrap(10, false, true)).toEqual('      text');
    });

    it('avoid splitting the content with text', () => {
      const sections: HelpSections = [
        { type: 'text', content: { text: `text ${style(tf.clear)} spaces`, noSplit: true } },
      ];
      expect(format({}, sections).wrap()).toEqual('text  spaces');
    });
  });
});
