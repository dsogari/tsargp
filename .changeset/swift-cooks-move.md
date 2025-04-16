---
'tsargp': minor
---

Add support for nested ANSI template literals.

**Breaking changes**:

- style resetting attributes (from `tf`, `fg`, `bg` and `ul`) were refactored into the `rs` enumeration

**Other changes**:

- added a `rs` enumeration for style resetting attributes (although not exposed in the public API)

**Usage notes**:

You can now embed ANSI template literals within other literals, without explicitly resetting their styles, e.g.:

```ts
const options = {
  single: {
    type: 'single',
    synopsis: ansi`An option with ${ansi.style(tf.bold)`bold type face`}.`,
    // ...other option attributes
  },
} as const satisfies Options;
```
