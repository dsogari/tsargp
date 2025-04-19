---
'tsargp': minor
---

Add validation flag for similar option name validation.

**Breaking changes**:

- similar option name validation is no longer enabled by default; the related validation flag should be used instead

**Other changes**:

- the `similarity` field has been added to the `ValidationFlags` type, to configure similar option name validation

**Usage notes**:

You can now configure the threshold for similar option name validation, e.g.:

```ts
const flags: ValidationFlags = {
  // other flags...
  similarity: 0.8, // at least 80% of similarity
};
```
