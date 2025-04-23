---
'tsargp': minor
---

Add support for parameter markers.

**Breaking changes**:

- the completion algorithm now ignores inline constraints

**Other changes**:

- the `marker` option attribute has been added to `array` and `function` option types

**Usage notes**:

You can now configure parameter delimiters for array and function options, e.g.:

```ts
const options = {
  array: {
    type: 'array',
    marker: '--', // starting marker
  },
  function: {
    type: 'function',
    marker: ['[', ']'], // starting and ending markers
  },
} as const satisfies Options;
```
