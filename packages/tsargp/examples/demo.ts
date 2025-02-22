#!/usr/bin/env node
import { ArgumentParser, valuesFor } from 'tsargp';
import options from './demo.options.js';

try {
  const parser = new ArgumentParser(options);
  const values = valuesFor(options);
  const { warning } = await parser.parseInto(values, undefined, { clusterPrefix: '-' });
  if (warning) {
    console.error(`${warning}`);
  }
  if (!values.hello) {
    console.log(values);
  }
} catch (err) {
  if (err instanceof Error) {
    console.error(`${err}`);
    process.exitCode = 1;
  } else {
    console.log(`${err}`); // help, version or completion words
  }
}
