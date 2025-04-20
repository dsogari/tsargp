#!/usr/bin/env bun
import type { HelpTextSection, ParsingFlags } from 'tsargp';
import { format, getVersion, handleError, parseInto, sectionFooter, valuesFor } from 'tsargp';
import options from './demo.options.js';

// cannot be used in the browser
const packageVersion = await getVersion('tsargp/package');
const footerSection: HelpTextSection = {
  type: 'text',
  content: {
    text: await sectionFooter('tsargp/package', `Report bugs: #0`, '/issues'),
    breaks: 1,
  },
};

// @ts-expect-error inject package version
options.version.version = packageVersion;

// @ts-expect-error inject footer section
options.help.sections.push(footerSection);

// @ts-expect-error inject footer section
options.helpEnv.sections.push(footerSection);

const flags: ParsingFlags = {
  progName: 'tsargp',
  clusterPrefix: '-',
  optionPrefix: '-',
  stdinSymbol: '-',
  similarity: 0.6,
  format,
};

try {
  const values = valuesFor(options);
  const { warning } = await parseInto(options, values, undefined, flags);
  if (warning) {
    console.error('' + warning);
  }
  if (!values.hello) {
    console.log(values);
  }
} catch (err) {
  handleError(err);
}
