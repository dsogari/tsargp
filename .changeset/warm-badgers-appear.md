---
'tsargp': minor
---

Add parsing flag for option name suggestions.

**Breaking changes**:

- option name suggestion is no longer enabled by default; the related parsing flag should be used instead

**Other changes**:

- the `suggestNames` field has been added to the `ParsingFlags` type, to configure option name suggestions

**Usage notes**:

You can now enable or disable option name suggestions with a parsing flag, e.g.:

```ts
const flags: ParsingFlags = {
  // other flags...
  suggestNames: true,
};
```

You can also specify a custom similarity threshold, e.g.:

```ts
const flags: ParsingFlags = {
  // other flags...
  suggestNames: 0.6, // at least 60% of similarity
};
```
