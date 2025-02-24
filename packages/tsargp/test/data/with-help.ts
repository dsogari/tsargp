import type { Options } from 'tsargp';

export default {
  help: {
    type: 'help',
    names: ['-h'],
  },
  flag: {
    type: 'flag',
    names: ['-f'],
  },
} as const satisfies Options;
