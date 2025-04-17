# tsargp

## 1.19.0

### Minor Changes

- 61c2fc7: Add base style for error messages.

  **Breaking changes**:

  - the `WarnMessage` class has been removed in favor of the unified `ErrorMessage` class
  - the `ErrorMessage` class constructor has been removed

  **Other changes**:

  - an `error` field has been added to `config.styles` to specify the base style for error messages
  - an `add` method has been added to `AnsiMessage` to append ANSI strings with a trailing line feed

  **Usage notes**:

  Error messages can now be created with a list of ANSI strings, e.g.:

  ```ts
  throw new ErrorMessage(ansi`Error with arguments: ${'abc'}: ${123}`);
  ```

  Alternatively, the `add` method can be called to append new strings, e.g.:

  ```ts
  throw new ErrorMessage().add('Error with arguments: #0: #1', {}, 'abc', 123);
  ```

- e499465: Add support for nested ANSI template literals.

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

## 1.18.0

### Minor Changes

- 18c6b63: Refactor the `ErrorMessage` class to use `WarnMessage` as base.

  **Breaking changes**:

  - Due to the introduction of the `handleError` function, inheriting from `Error` is no longer needed.

### Patch Changes

- 859c583: Update the **demo** example to use the `progName` parsing flag.

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
