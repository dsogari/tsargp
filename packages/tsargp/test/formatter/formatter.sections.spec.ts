import { describe, expect, it } from 'bun:test';
import type { Options, HelpSections } from '../../lib/options';
import { HelpFormatter } from '../../lib/formatter';
import { tf } from '../../lib/enums';
import { style } from '../../lib/styles';

process.env['FORCE_WIDTH'] = '0'; // omit styles

describe('HelpFormatter', () => {
  describe('sections', () => {
    it('handle no sections', () => {
      const message = new HelpFormatter({}).sections([]);
      expect(message.wrap()).toEqual('');
    });

    it('avoid splitting and wrapping section texts when explicitly asked', () => {
      const options = {
        flag: {
          type: 'flag',
          names: ['-f'],
        },
      } as const satisfies Options;
      const sections: HelpSections = [
        {
          type: 'text',
          title: `section ${style(tf.clear)} title`,
          text: `section ${style(tf.clear)} text`,
          noWrap: true,
        },
        { type: 'usage', title: `section ${style(tf.clear)} title`, noWrap: true },
        { type: 'groups', title: `section ${style(tf.clear)} title`, noWrap: true },
      ];
      const message = new HelpFormatter(options).sections(sections);
      expect(message.wrap()).toEqual(
        'section ' +
          '\x1b[0m' +
          ' title\n\nsection ' +
          '\x1b[0m' +
          ' text\n\nsection ' +
          '\x1b[0m' +
          ' title\n\n[-f]\n\nsection ' +
          '\x1b[0m' +
          ' title\n\n  -f\n',
      );
    });

    describe('rendering a text section', () => {
      it('skip a section with no content', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'text' }];
        expect(formatter.sections(sections).wrap()).toEqual('');
      });

      it('render the section content', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'text', text: 'text' }];
        expect(formatter.sections(sections).wrap()).toEqual('text\n');
      });

      it('indent the section content', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'text', text: 'text', indent: 2 }];
        expect(formatter.sections(sections).wrap()).toEqual('  text\n');
      });

      it('break the section content', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'text', text: 'text', breaks: 1 }];
        expect(formatter.sections(sections).wrap()).toEqual('\ntext\n');
      });

      it('render the section heading, but avoid indenting it', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'text', title: 'title', indent: 2 }];
        expect(formatter.sections(sections).wrap()).toEqual('title\n');
      });

      it('break the section heading', () => {
        const formatter = new HelpFormatter({});
        const sections: HelpSections = [{ type: 'text', title: 'title', breaks: 1 }];
        expect(formatter.sections(sections).wrap()).toEqual('\ntitle\n');
      });
    });
  });
});
