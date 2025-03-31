---
'tsargp': minor
---

Add `ansi` function for creating ANSI strings from tagged template literals.

**Usage notes**:

The new `ansi` tag function creates a ANSI string and formats the template literal just as the `format` method would do with a given phrase and arguments. The formatting flags have default values, and the placeholder arguments are the template literal arguments, in the same order.
