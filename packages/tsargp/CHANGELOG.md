# tsargp

## 1.17.0

### Minor Changes

- 26c7ab7: Add `handleError` utility function to ease handling of errors in client code.
- f773ba4: Add `ansi` function for creating ANSI strings from tagged template literals.

  **Usage notes**:

  The new `ansi` tag function creates a ANSI string and formats the template literal just as the `format` method would do with a given phrase and arguments. The formatting flags have default values, and the placeholder arguments are the template literal arguments, in the same order.

## 1.16.0

### Minor Changes

- 00b6666: Add support for option-specific layout settings.

  **Breaking changes**:

  - extract layout settings from `WithSectionGroups` to the new `HelpLayout` type

  **Other changes**:

  - add `layout` attribute to `WithBasicAttributes` and `WithSectionGroups` types

  **Usage notes**:

  You can now set layout settings directly in an option definition, e.g.:

  ```ts
  const options = {
    single: {
      type: 'single',
      layout: {
        names: { align: 'right' },
        param: { maxWidth: 12 },
        descr: { merge: true },
        // ...other layout settings
      },
      // ...other option attributes
    },
  } as const satisfies Options;
  ```

  They will override section-level settings (although not recursively, since `Object.assign` is used for that purpose).
