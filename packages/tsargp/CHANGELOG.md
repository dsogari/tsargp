# tsargp

## 1.16.0

### Minor Changes

- 54a130b: Add support for option-specific layout settings.

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
