#!/usr/bin/env bun
import { parseInto, valuesFor } from 'tsargp';
import options from './demo.options.js';

try {
  const values = valuesFor(options);
  const { warning } = await parseInto(options, values, undefined, {
    clusterPrefix: '-',
    optionPrefix: '-',
    stdinDesignator: '-',
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
