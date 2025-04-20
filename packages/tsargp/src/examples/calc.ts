#!/usr/bin/env bun
import { format, handleError, parse } from 'tsargp';
import options from './calc.options.js';

try {
  const values = await parse(options, undefined, { format });
  const result = values.add ?? values.sub ?? values.mult ?? values.div ?? NaN;
  console.log(result);
} catch (err) {
  handleError(err);
}
