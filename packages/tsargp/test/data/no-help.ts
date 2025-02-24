import type { Options } from 'tsargp';

export default {
  flag: {
    type: 'flag',
    names: ['-f'],
  },
} as const satisfies Options;
