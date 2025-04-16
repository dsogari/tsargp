---
'tsargp': minor
---

Add support for nested ANSI template literals.

**Breaking changes**:

- style resetting attributes (from `tf`, `fg`, `bg` and `ul`) were refactored into the `rs` enumeration
- inline styles are no longer supported; the `ansi.style` tag function should be used instead
- the ANSI string class was refactored to support the new behavior (some methods were removed)

**Other changes**:

- added the `rs` enumeration for style resetting attributes (although not exposed in the public API)
- added the `style` method to the `ansi` template tag function to create ANSI strings with styles

**Usage notes**:

You can now embed ANSI template literals within other literals, without explicitly resetting their styles, e.g.:

```ts
const options = {
  single: {
    type: 'single',
    synopsis: ansi`An option with ${ansi.style(tf.bold)`bold type face`} and a number: ${1}.`,
    // ...other option attributes
  },
} as const satisfies Options;
```

This is now the _only_ way to create strings with styles. Using external styling packages no longer works.
