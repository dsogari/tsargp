#!/usr/bin/env bun
import { parseInto, valuesFor, getVersion, sectionFooter, type HelpTextSection } from 'tsargp';
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

try {
  const values = valuesFor(options);
  const { warning } = await parseInto(options, values, undefined, {
    clusterPrefix: '-',
    optionPrefix: '-',
    stdinSymbol: '-',
  });
  if (warning) {
    console.error('' + warning);
  }
  if (!values.hello) {
    console.log(values);
  }
} catch (err) {
  if (err instanceof Error) {
    console.error('' + err);
    process.exitCode = 1;
  } else {
    console.log('' + err); // help, version or completion
  }
}
