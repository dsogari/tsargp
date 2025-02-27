import { describe, expect, it } from 'bun:test';
import type { HelpSections } from '../../../lib/options';
import { format } from '../../../lib/formatter';

describe('rendering a text section', () => {
  it('skip a section with no content', () => {
    const sections: HelpSections = [{ type: 'text' }];
    expect(format({}, sections).wrap()).toEqual('');
  });

  it('render the section content', () => {
    const sections: HelpSections = [{ type: 'text', text: 'text' }];
    expect(format({}, sections).wrap()).toEqual('text\n');
  });

  it('indent the section content', () => {
    const sections: HelpSections = [{ type: 'text', text: 'text', indent: 2 }];
    expect(format({}, sections).wrap()).toEqual('  text\n');
  });

  it('break the section content', () => {
    const sections: HelpSections = [{ type: 'text', text: 'text', breaks: 1 }];
    expect(format({}, sections).wrap()).toEqual('\ntext\n');
  });

  it('render the section heading, but avoid indenting it', () => {
    const sections: HelpSections = [{ type: 'text', title: 'title', indent: 2 }];
    expect(format({}, sections).wrap()).toEqual('title\n');
  });

  it('break the section heading', () => {
    const sections: HelpSections = [{ type: 'text', title: 'title', breaks: 1 }];
    expect(format({}, sections).wrap()).toEqual('\ntitle\n');
  });
});
