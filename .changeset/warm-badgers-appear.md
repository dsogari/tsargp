---
'tsargp': minor
---

Add parsing flag for option name suggestions.

**Breaking changes**:

- option name suggestion is no longer enabled by default; the related parsing flag should be used instead

**Other changes**:

- the `similarity` field has been added to the `ParsingFlags` type, to configure option name suggestions

**Usage notes**:

You can now configure the threshold for option name suggestions, e.g.:

```ts
const flags: ParsingFlags = {
  // other flags...
  similarity: 0.6, // at least 60% of similarity
};
```
