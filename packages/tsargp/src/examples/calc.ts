#!/usr/bin/env bun
import { parse, handleError } from 'tsargp';
import options from './calc.options.js';

try {
  const values = await parse(options);
  const result = values.add ?? values.sub ?? values.mult ?? values.div ?? NaN;
  console.log(result);
} catch (err) {
  handleError(err);
}
