---
'tsargp': minor
---

Add support for multiple positional options.

**Breaking changes**:

- the `positional` attribute of non-niladic options can no longer be used to specify a marker

**Other changes**:

- the `marker` attribute has been added to non-niladic options to enable parsing of _trailing_ arguments

**Usage notes**:

You can now declare more than one positional option in the same definition level, e.g.:

```ts
const options = {
  single: {
    type: 'single',
    positional: true, // will parse the first positional argument
  },
  array: {
    type: 'array',
    positional: true, // will parse the remaining positional arguments
  },
} as const satisfies Options;
```

You can also declare more than one trailing marker in the same definition level, e.g.:

```ts
const options = {
  single: {
    type: 'single',
    marker: '--', // will parse trailing arguments preceded by '--'
  },
  array: {
    type: 'array',
    marker: '++', // will parse trailing arguments preceded by '++'
  },
} as const satisfies Options;
```
