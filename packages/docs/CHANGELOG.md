# @tsargp/docs

## 1.20.0

### Minor Changes

- c119461: Document the new behavior of positional options.

  - **Options** page has been updated to document the new behavior of the `positional` and `marker` attributes
  - **Parser** page has been updated to document the new `position` field in the argument sequence information
  - **Validator** page has been updated to remove the validation rule about duplicate positional options
  - **Formatter** page has been updated to document the new behavior of trailing markers in usage sections
  - **Styles** page has been updated to remove the `duplicatePositionalOption` error item and document the new `marker` help item

### Patch Changes

- 3d2275e: Update dependencies.

  - `next` - 15.3.0
  - `typedoc` - 0.28.2

## 1.19.0

### Minor Changes

- e499465: Document the new behavior of ANSI strings.

  - **Styles** page has been updated to reflect the changes made to the `ansi` tag function for template literals.

- 61c2fc7: Document the new behavior of error messages.

  - **Styles** page has been updated to reflect the changes made to the `ErrorMessage` class and the `config`
  - other pages have been updated to point to the section about error messages in the above page

## 1.18.0

### Minor Changes

- 18c6b63: Document the new behavior of the `ErrorMessage` class.

  - **Styles** page has been updated to reflect the changes made to the `ErrorMessage` class.

### Patch Changes

- 859c583: Update **Introduction** and **Formatter** pages to reflect changes in the **demo** example.

## 1.17.0

### Minor Changes

- f773ba4: Document usage of the new `ansi` tag function.

  - **Styles** page has been updated to document how ANSI string instances can be created via the new function for tagged template literals.

- 26c7ab7: Document usage of the new `handleError` utility function.

  - **Introduction** page has been updated to use the new function in code samples.

### Patch Changes

- d25ad89: Document unsupported option dependencies in usage section.

  - **Formatter** page has been updated to document the kinds of option dependencies that cannot currently be expressed in usage statements

## 1.16.0

### Minor Changes

- 00b6666: Add support for option-specific layout settings.

  - **Formatter** page has been updated to reflect changes made to the library code
