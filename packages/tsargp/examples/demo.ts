#!/usr/bin/env node
import { ArgumentParser } from 'tsargp';
import options from './demo.options.js';

/**
 * An interface for the option values. (To make sure that they comply with it.)
 */
interface Values {
  help: never;
  version: never;
  flag: boolean | undefined;
  hello: number | undefined;
  boolean: boolean;
  stringRegex: string;
  numberRange: number;
  stringEnum: 'one' | 'two' | undefined;
  numberEnum: 1 | 2 | undefined;
  strings: Array<string>;
  numbers: Array<number>;
  stringsLimit: Array<string> | undefined;
  numbersUnique: Array<number> | undefined;
}

try {
  const parser = new ArgumentParser(options);
  const values = {} as Values;
  const { warning } = await parser.parseInto(values, undefined, { clusterPrefix: '-' });
  if (warning) {
    console.log(`${warning}`);
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
