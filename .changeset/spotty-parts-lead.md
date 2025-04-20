---
'tsargp': minor
---

Make the formatter component tree-shakeable.

**Breaking changes**:

- the parser no longer imports the formatting function for help messages; instead, it should be injected

**Other changes**:

- the `format` field has been added to the `ParsingFlags` type, to specify the formatting function for help messages

**Usage notes**:

You should now specify the formatting function for help messages, e.g.:

```ts
const flags: ParsingFlags = {
  // other flags...
  format, // imported from 'tsargp'
};
```
