---
'tsargp': minor
---

Add parsing flag for the positional marker(s).

**Breaking changes**:

- the `marker` option attribute was removed; the related parsing flag should be used instead
- some parsing flags were renamed to be more explicit:
  - `progName` becomes `programName`
  - `compIndex` becomes `completionIndex`

**Other changes**:

- the `positionalMarker` field has been added to the `ParsingFlags` type, to specify the positional marker(s)

**Usage notes**:

You can now specify the positional marker(s) at parsing level, e.g.:

```ts
const flags: ParsingFlags = {
  // other flags...
  positionalMarker: '--', // trailing marker for positional arguments
};
```
